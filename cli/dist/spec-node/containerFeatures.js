"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRemoteUserUID = exports.generateContainerEnvs = exports.getExtendImageBuildInfo = exports.extendImage = void 0;
const path = __importStar(require("path"));
const string_decoder_1 = require("string_decoder");
const tar = __importStar(require("tar"));
const dockerUtils_1 = require("../spec-shutdown/dockerUtils");
const log_1 = require("../spec-utils/log");
const containerFeaturesConfiguration_1 = require("../spec-configuration/containerFeaturesConfiguration");
const pfs_1 = require("../spec-utils/pfs");
const product_1 = require("../spec-utils/product");
const utils_1 = require("./utils");
async function extendImage(params, config, imageName, pullImageOnError) {
    let cache;
    const { common } = params;
    const { cliHost, output } = common;
    const imageDetails = () => cache || (cache = (0, utils_1.inspectDockerImage)(params, imageName, pullImageOnError));
    const imageLabelDetails = async () => {
        const labels = (await imageDetails()).Config.Labels || {};
        return {
            definition: labels['com.visualstudio.code.devcontainers.id'],
            version: labels['version'],
        };
    };
    const imageUser = (await imageDetails()).Config.User || 'root';
    const extendImageDetails = await getExtendImageBuildInfo(params, config, imageName, imageUser, imageLabelDetails);
    if (!extendImageDetails || !extendImageDetails.featureBuildInfo) {
        // no feature extensions - return
        return {
            updatedImageName: imageName,
            collapsedFeaturesConfig: undefined,
            imageDetails
        };
    }
    const { featureBuildInfo, collapsedFeaturesConfig } = extendImageDetails;
    // Got feature extensions -> build the image
    const dockerfilePath = cliHost.path.join(featureBuildInfo.dstFolder, 'Dockerfile.extended');
    await cliHost.writeFile(dockerfilePath, Buffer.from(featureBuildInfo.dockerfilePrefixContent + featureBuildInfo.dockerfileContent));
    const folderImageName = (0, utils_1.getFolderImageName)(common);
    const updatedImageName = `${imageName.startsWith(folderImageName) ? imageName : folderImageName}-features`;
    const args = [];
    if (params.useBuildKit) {
        args.push('buildx', 'build', '--load');
        for (const buildContext in featureBuildInfo.buildKitContexts) {
            args.push('--build-context', `${buildContext}=${featureBuildInfo.buildKitContexts[buildContext]}`);
        }
    }
    else {
        args.push('build');
    }
    for (const buildArg in featureBuildInfo.buildArgs) {
        args.push('--build-arg', `${buildArg}=${featureBuildInfo.buildArgs[buildArg]}`);
    }
    // Once this is step merged with the user Dockerfile (or working against the base image),
    // the path will be the dev container context
    // Set empty dir under temp path as the context for now to ensure we don't have dependencies on the features content
    const emptyTempDir = path.posix.join(await cliHost.tmpdir(), '__dev-containers-build-empty');
    cliHost.mkdirp(emptyTempDir);
    args.push('-t', updatedImageName, '-f', dockerfilePath, emptyTempDir);
    if (process.stdin.isTTY) {
        const infoParams = { ...(0, dockerUtils_1.toPtyExecParameters)(params), output: (0, log_1.makeLog)(output, log_1.LogLevel.Info) };
        await (0, dockerUtils_1.dockerPtyCLI)(infoParams, ...args);
    }
    else {
        const infoParams = { ...(0, dockerUtils_1.toExecParameters)(params), output: (0, log_1.makeLog)(output, log_1.LogLevel.Info), print: 'continuous' };
        await (0, dockerUtils_1.dockerCLI)(infoParams, ...args);
    }
    return { updatedImageName, collapsedFeaturesConfig, imageDetails };
}
exports.extendImage = extendImage;
async function getExtendImageBuildInfo(params, config, baseName, imageUser, imageLabelDetails) {
    const featuresConfig = await (0, containerFeaturesConfiguration_1.generateFeaturesConfig)(params.common, (await (0, utils_1.createFeaturesTempFolder)(params.common)), config, imageLabelDetails, containerFeaturesConfiguration_1.getContainerFeaturesFolder);
    if (!featuresConfig) {
        return null;
    }
    const collapsedFeaturesConfig = (0, containerFeaturesConfiguration_1.collapseFeaturesConfig)(featuresConfig);
    const featureBuildInfo = await getContainerFeaturesBuildInfo(params, featuresConfig, baseName, imageUser);
    if (!featureBuildInfo) {
        return null;
    }
    return { featureBuildInfo, collapsedFeaturesConfig };
}
exports.getExtendImageBuildInfo = getExtendImageBuildInfo;
// NOTE: only exported to enable testing. Not meant to be called outside file.
function generateContainerEnvs(featuresConfig) {
    let result = '';
    for (const fSet of featuresConfig.featureSets) {
        result += fSet.features
            .filter(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value)
            .reduce((envs, f) => envs.concat(Object.keys(f.containerEnv || {})
            .map(k => `ENV ${k}=${f.containerEnv[k]}`)), [])
            .join('\n');
    }
    return result;
}
exports.generateContainerEnvs = generateContainerEnvs;
async function getContainerFeaturesBuildInfo(params, featuresConfig, baseName, imageUser) {
    const { common } = params;
    const { cliHost, output } = common;
    const { dstFolder } = featuresConfig;
    if (!dstFolder || dstFolder === '') {
        output.write('dstFolder is undefined or empty in addContainerFeatures', log_1.LogLevel.Error);
        return null;
    }
    // Calculate name of the build folder where localcache has been copied to.
    const localCacheBuildFolderName = (0, containerFeaturesConfiguration_1.getSourceInfoString)({ type: 'local-cache' });
    const srcFolder = (0, containerFeaturesConfiguration_1.getContainerFeaturesFolder)(common.extensionPath);
    output.write(`local container features stored at: ${srcFolder}`);
    await cliHost.mkdirp(`${dstFolder}/${localCacheBuildFolderName}`);
    const create = tar.c({
        cwd: srcFolder,
        filter: path => (path !== './Dockerfile' && path !== './devcontainer-features.json'),
    }, ['.']);
    const createExit = new Promise((resolve, reject) => {
        create.on('error', reject);
        create.on('finish', resolve);
    });
    const extract = await cliHost.exec({
        cmd: 'tar',
        args: [
            '--no-same-owner',
            '-x',
            '-f', '-',
        ],
        cwd: `${dstFolder}/${localCacheBuildFolderName}`,
        output,
    });
    const stdoutDecoder = new string_decoder_1.StringDecoder();
    extract.stdout.on('data', (chunk) => {
        output.write(stdoutDecoder.write(chunk));
    });
    const stderrDecoder = new string_decoder_1.StringDecoder();
    extract.stderr.on('data', (chunk) => {
        output.write((0, log_1.toErrorText)(stderrDecoder.write(chunk)));
    });
    create.pipe(extract.stdin);
    await extract.exit;
    await createExit; // Allow errors to surface.
    const buildStageScripts = await Promise.all(featuresConfig.featureSets
        .map(featureSet => containerFeaturesConfiguration_1.multiStageBuildExploration ? featureSet.features
        .filter(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value)
        .reduce(async (binScripts, feature) => {
        const binPath = cliHost.path.join(dstFolder, (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'features', feature.id, 'bin');
        const hasAcquire = cliHost.isFile(cliHost.path.join(binPath, 'acquire'));
        const hasConfigure = cliHost.isFile(cliHost.path.join(binPath, 'configure'));
        const map = await binScripts;
        map[feature.id] = {
            hasAcquire: await hasAcquire,
            hasConfigure: await hasConfigure,
        };
        return map;
    }, Promise.resolve({})) : Promise.resolve({})));
    // With Buildkit, we can supply an additional build context to provide access to
    // the container-features content.
    // For non-Buildkit, we build a temporary image to hold the container-features content in a way
    // that is accessible from the docker build for non-BuiltKit builds
    // TODO generate an image name that is specific to this dev container?
    const buildContentImageName = 'dev_container_feature_content_temp';
    // When copying via buildkit, the content is accessed via '.' (i.e. in the context root)
    // When copying via temp image, the content is in '/tmp/build-features'
    const contentSourceRootPath = params.useBuildKit ? '.' : '/tmp/build-features/';
    const dockerfile = (0, containerFeaturesConfiguration_1.getContainerFeaturesBaseDockerFile)()
        .replace('#{nonBuildKitFeatureContentFallback}', params.useBuildKit ? '' : `FROM ${buildContentImageName} as dev_containers_feature_content_source`)
        .replace('{contentSourceRootPath}', contentSourceRootPath)
        .replace('#{featureBuildStages}', getFeatureBuildStages(featuresConfig, buildStageScripts, contentSourceRootPath))
        .replace('#{featureLayer}', (0, containerFeaturesConfiguration_1.getFeatureLayers)(featuresConfig))
        .replace('#{containerEnv}', generateContainerEnvs(featuresConfig))
        .replace('#{copyFeatureBuildStages}', getCopyFeatureBuildStages(featuresConfig, buildStageScripts));
    const dockerfilePrefixContent = `${params.useBuildKit ? '# syntax=docker/dockerfile:1.4' : ''}
ARG _DEV_CONTAINERS_BASE_IMAGE=mcr.microsoft.com/vscode/devcontainers/base:buster
`;
    // Build devcontainer-features.env file(s) for each features source folder
    await Promise.all([...featuresConfig.featureSets].map(async (featureSet, i) => {
        const featuresEnv = [].concat(...featureSet.features
            .filter(f => { var _a; return (product_1.includeAllConfiguredFeatures || f.included) && f.value && !((_a = buildStageScripts[i][f.id]) === null || _a === void 0 ? void 0 : _a.hasAcquire); })
            .map(getFeatureEnvVariables)).join('\n');
        const envPath = cliHost.path.join(dstFolder, (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'devcontainer-features.env'); // next to install.sh
        await Promise.all([
            cliHost.writeFile(envPath, Buffer.from(featuresEnv)),
            ...featureSet.features
                .filter(f => { var _a; return (product_1.includeAllConfiguredFeatures || f.included) && f.value && ((_a = buildStageScripts[i][f.id]) === null || _a === void 0 ? void 0 : _a.hasAcquire); })
                .map(f => {
                const featuresEnv = [
                    ...getFeatureEnvVariables(f),
                    `_BUILD_ARG_${getFeatureSafeId(f)}_TARGETPATH=${path.posix.join('/usr/local/devcontainer-features', (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), f.id)}`
                ]
                    .join('\n');
                const envPath = cliHost.path.join(dstFolder, (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'features', f.id, 'devcontainer-features.env'); // next to bin/acquire
                return cliHost.writeFile(envPath, Buffer.from(featuresEnv));
            })
        ]);
    }));
    // For non-BuildKit, build the temporary image for the container-features content
    if (!params.useBuildKit) {
        const buildContentDockerfile = `
	FROM scratch
	COPY . /tmp/build-features/
	`;
        const buildContentDockerfilePath = cliHost.path.join(dstFolder, 'Dockerfile.buildContent');
        await cliHost.writeFile(buildContentDockerfilePath, Buffer.from(buildContentDockerfile));
        const buildContentArgs = [
            'build',
            '-t', buildContentImageName,
            '-f', buildContentDockerfilePath,
        ];
        buildContentArgs.push(dstFolder);
        if (process.stdin.isTTY) {
            const buildContentInfoParams = { ...(0, dockerUtils_1.toPtyExecParameters)(params), output: (0, log_1.makeLog)(output, log_1.LogLevel.Info) };
            await (0, dockerUtils_1.dockerPtyCLI)(buildContentInfoParams, ...buildContentArgs);
        }
        else {
            const buildContentInfoParams = { ...(0, dockerUtils_1.toExecParameters)(params), output: (0, log_1.makeLog)(output, log_1.LogLevel.Info), print: 'continuous' };
            await (0, dockerUtils_1.dockerCLI)(buildContentInfoParams, ...buildContentArgs);
        }
    }
    return {
        dstFolder,
        dockerfileContent: dockerfile,
        dockerfilePrefixContent,
        buildArgs: {
            _DEV_CONTAINERS_BASE_IMAGE: baseName,
            _DEV_CONTAINERS_IMAGE_USER: imageUser,
            _DEV_CONTAINERS_FEATURE_CONTENT_SOURCE: buildContentImageName,
        },
        buildKitContexts: params.useBuildKit ? { dev_containers_feature_content_source: dstFolder } : {},
    };
}
function getFeatureBuildStages(featuresConfig, buildStageScripts, contentSourceRootPath) {
    return [].concat(...featuresConfig.featureSets
        .map((featureSet, i) => featureSet.features
        .filter(f => { var _a; return (product_1.includeAllConfiguredFeatures || f.included) && f.value && ((_a = buildStageScripts[i][f.id]) === null || _a === void 0 ? void 0 : _a.hasAcquire); })
        .map(f => `FROM mcr.microsoft.com/vscode/devcontainers/base:0-focal as ${(0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation)}_${f.id}
COPY --from=dev_containers_feature_content_source ${path.posix.join(contentSourceRootPath, (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'features', f.id)} ${path.posix.join('/tmp/build-features', (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'features', f.id)}
COPY --from=dev_containers_feature_content_source ${path.posix.join(contentSourceRootPath, (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'common')} ${path.posix.join('/tmp/build-features', (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'common')}
RUN cd ${path.posix.join('/tmp/build-features', (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'features', f.id)} && set -a && . ./devcontainer-features.env && set +a && ./bin/acquire`))).join('\n\n');
}
function getCopyFeatureBuildStages(featuresConfig, buildStageScripts) {
    return [].concat(...featuresConfig.featureSets
        .map((featureSet, i) => featureSet.features
        .filter(f => { var _a; return (product_1.includeAllConfiguredFeatures || f.included) && f.value && ((_a = buildStageScripts[i][f.id]) === null || _a === void 0 ? void 0 : _a.hasAcquire); })
        .map(f => {
        var _a;
        const featurePath = path.posix.join('/usr/local/devcontainer-features', (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), f.id);
        return `COPY --from=${(0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation)}_${f.id} ${featurePath} ${featurePath}${((_a = buildStageScripts[i][f.id]) === null || _a === void 0 ? void 0 : _a.hasConfigure) ? `
RUN cd ${path.posix.join('/tmp/build-features', (0, containerFeaturesConfiguration_1.getSourceInfoString)(featureSet.sourceInformation), 'features', f.id)} && set -a && . ./devcontainer-features.env && set +a && ./bin/configure` : ''}`;
    }))).join('\n\n');
}
function getFeatureEnvVariables(f) {
    const values = (0, containerFeaturesConfiguration_1.getFeatureValueObject)(f);
    const idSafe = getFeatureSafeId(f);
    const variables = [];
    if (values) {
        variables.push(...Object.keys(values)
            .map(name => `_BUILD_ARG_${idSafe}_${name.toUpperCase()}="${values[name]}"`));
        variables.push(`_BUILD_ARG_${idSafe}=true`);
    }
    if (f.buildArg) {
        variables.push(`${f.buildArg}=${(0, containerFeaturesConfiguration_1.getFeatureMainValue)(f)}`);
    }
    return variables;
}
function getFeatureSafeId(f) {
    return f.id
        .replace(/[/-]/g, '_') // Slashes and dashes are not allowed in an env. variable key
        .toUpperCase();
}
async function updateRemoteUserUID(params, config, imageName, imageDetails, runArgsUser) {
    const { common } = params;
    const { cliHost } = common;
    if (params.updateRemoteUserUIDDefault === 'never' || !(typeof config.updateRemoteUserUID === 'boolean' ? config.updateRemoteUserUID : params.updateRemoteUserUIDDefault === 'on') || !(cliHost.platform === 'linux' || params.updateRemoteUserUIDOnMacOS && cliHost.platform === 'darwin')) {
        return imageName;
    }
    const imageUser = (await imageDetails()).Config.User || 'root';
    const remoteUser = config.remoteUser || runArgsUser || imageUser;
    if (remoteUser === 'root' || /^\d+$/.test(remoteUser)) {
        return imageName;
    }
    const folderImageName = (0, utils_1.getFolderImageName)(common);
    const fixedImageName = `${imageName.startsWith(folderImageName) ? imageName : folderImageName}-uid`;
    const dockerfileName = 'updateUID.Dockerfile';
    const srcDockerfile = path.join(common.extensionPath, 'scripts', dockerfileName);
    const version = common.package.version;
    const destDockerfile = cliHost.path.join(await cliHost.tmpdir(), 'vsch', `${dockerfileName}-${version}`);
    const tmpDockerfile = `${destDockerfile}-${Date.now()}`;
    await cliHost.mkdirp(cliHost.path.dirname(tmpDockerfile));
    await cliHost.writeFile(tmpDockerfile, await (0, pfs_1.readLocalFile)(srcDockerfile));
    await cliHost.rename(tmpDockerfile, destDockerfile);
    const args = [
        'build',
        '-f', destDockerfile,
        '-t', fixedImageName,
        '--build-arg', `BASE_IMAGE=${imageName}`,
        '--build-arg', `REMOTE_USER=${remoteUser}`,
        '--build-arg', `NEW_UID=${await cliHost.getuid()}`,
        '--build-arg', `NEW_GID=${await cliHost.getgid()}`,
        '--build-arg', `IMAGE_USER=${imageUser}`,
        cliHost.path.dirname(destDockerfile)
    ];
    await (0, dockerUtils_1.dockerPtyCLI)(params, ...args);
    return fixedImageName;
}
exports.updateRemoteUserUID = updateRemoteUserUID;
