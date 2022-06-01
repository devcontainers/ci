"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.bailOut = exports.spawnDevContainer = exports.findDevContainer = exports.findExistingContainer = exports.findUserArg = exports.buildNamedImageAndExtend = exports.openDockerfileDevContainer = exports.hostFolderLabel = void 0;
const utils_1 = require("./utils");
const injectHeadless_1 = require("../spec-common/injectHeadless");
const errors_1 = require("../spec-common/errors");
const dockerUtils_1 = require("../spec-shutdown/dockerUtils");
const log_1 = require("../spec-utils/log");
const containerFeatures_1 = require("./containerFeatures");
const product_1 = require("../spec-utils/product");
exports.hostFolderLabel = 'devcontainer.local_folder'; // used to label containers created from a workspace/folder
async function openDockerfileDevContainer(params, config, workspaceConfig, idLabels) {
    const { common } = params;
    // let collapsedFeaturesConfig: () => Promise<CollapsedFeaturesConfig | undefined>;
    let container;
    let containerProperties;
    try {
        container = await findExistingContainer(params, idLabels);
        if (container) {
            // let _collapsedFeatureConfig: Promise<CollapsedFeaturesConfig | undefined>;
            // collapsedFeaturesConfig = async () => {
            // 	return _collapsedFeatureConfig || (_collapsedFeatureConfig = (async () => {
            // 		const allLabels = container?.Config.Labels || {};
            // 		const featuresConfig = await generateFeaturesConfig(params.common, (await createFeaturesTempFolder(params.common)), config, async () => allLabels, getContainerFeaturesFolder);
            // 		return collapseFeaturesConfig(featuresConfig);
            // 	})());
            // };
            await startExistingContainer(params, idLabels, container);
        }
        else {
            const res = await buildNamedImageAndExtend(params, config);
            const updatedImageName = await (0, containerFeatures_1.updateRemoteUserUID)(params, config, res.updatedImageName, res.imageDetails, findUserArg(config.runArgs) || config.containerUser);
            // collapsedFeaturesConfig = async () => res.collapsedFeaturesConfig;
            try {
                await spawnDevContainer(params, config, res.collapsedFeaturesConfig, updatedImageName, idLabels, workspaceConfig.workspaceMount, res.imageDetails);
            }
            finally {
                // In 'finally' because 'docker run' can fail after creating the container.
                // Trying to get it here, so we can offer 'Rebuild Container' as an action later.
                container = await findDevContainer(params, idLabels);
            }
            if (!container) {
                return bailOut(common.output, 'Dev container not found.');
            }
        }
        containerProperties = await (0, utils_1.createContainerProperties)(params, container.Id, workspaceConfig.workspaceFolder, config.remoteUser);
        return await setupContainer(container, params, containerProperties, config);
    }
    catch (e) {
        throw createSetupError(e, container, params, containerProperties, config);
    }
}
exports.openDockerfileDevContainer = openDockerfileDevContainer;
function createSetupError(originalError, container, params, containerProperties, config) {
    const err = originalError instanceof errors_1.ContainerError ? originalError : new errors_1.ContainerError({
        description: 'An error occurred setting up the container.',
        originalError
    });
    if (container) {
        err.manageContainer = true;
        err.params = params.common;
        err.containerId = container.Id;
        err.dockerParams = params;
    }
    if (containerProperties) {
        err.containerProperties = containerProperties;
    }
    if (config) {
        err.config = config;
    }
    return err;
}
async function setupContainer(container, params, containerProperties, config) {
    const { common } = params;
    const { remoteEnv: extensionHostEnv, } = await (0, injectHeadless_1.setupInContainer)(common, containerProperties, config);
    return {
        params: common,
        properties: containerProperties,
        config,
        resolvedAuthority: {
            extensionHostEnv,
        },
        tunnelInformation: common.isLocalContainer ? (0, utils_1.getTunnelInformation)(container) : {},
        dockerParams: params,
        dockerContainerId: container.Id,
    };
}
async function buildNamedImageAndExtend(params, config) {
    var _a;
    const imageName = 'image' in config ? config.image : (0, utils_1.getFolderImageName)(params.common);
    params.common.progress(injectHeadless_1.ResolverProgress.BuildingImage);
    if ((0, utils_1.isDockerFileConfig)(config)) {
        return await buildAndExtendImage(params, config, imageName, (_a = params.buildNoCache) !== null && _a !== void 0 ? _a : false);
    }
    // image-based dev container - extend
    return await (0, containerFeatures_1.extendImage)(params, config, imageName, 'image' in config);
}
exports.buildNamedImageAndExtend = buildNamedImageAndExtend;
async function buildAndExtendImage(buildParams, config, baseImageName, noCache) {
    var _a, _b, _c, _d;
    const { cliHost, output } = buildParams.common;
    const dockerfileUri = (0, utils_1.getDockerfilePath)(cliHost, config);
    const dockerfilePath = await (0, utils_1.uriToWSLFsPath)(dockerfileUri, cliHost);
    if (!cliHost.isFile(dockerfilePath)) {
        throw new errors_1.ContainerError({ description: `Dockerfile (${dockerfilePath}) not found.` });
    }
    let dockerfile = (await cliHost.readFile(dockerfilePath)).toString();
    let baseName = 'dev_container_auto_added_stage_label';
    if ((_a = config.build) === null || _a === void 0 ? void 0 : _a.target) {
        // Explictly set build target for the dev container build features on that
        baseName = config.build.target;
    }
    else {
        // Use the last stage in the Dockerfile
        // Find the last line that starts with "FROM" (possibly preceeded by white-space)
        const { lastStageName, modifiedDockerfile } = (0, utils_1.ensureDockerfileHasFinalStageName)(dockerfile, baseName);
        baseName = lastStageName;
        if (modifiedDockerfile) {
            dockerfile = modifiedDockerfile;
        }
    }
    const labelDetails = async () => { return { definition: undefined, version: undefined }; };
    const extendImageBuildInfo = await (0, containerFeatures_1.getExtendImageBuildInfo)(buildParams, config, baseName, (_b = config.remoteUser) !== null && _b !== void 0 ? _b : 'root', labelDetails);
    let finalDockerfilePath = dockerfilePath;
    const additionalBuildArgs = [];
    if (extendImageBuildInfo) {
        const { featureBuildInfo } = extendImageBuildInfo;
        // We add a '# syntax' line at the start, so strip out any existing line
        const syntaxMatch = dockerfile.match(/^\s*#\s*syntax\s*=.*[\r\n]/g);
        if (syntaxMatch) {
            dockerfile = dockerfile.slice(syntaxMatch[0].length);
        }
        let finalDockerfileContent = `${featureBuildInfo.dockerfilePrefixContent}${dockerfile}\n${featureBuildInfo.dockerfileContent}`;
        finalDockerfilePath = cliHost.path.join(featureBuildInfo === null || featureBuildInfo === void 0 ? void 0 : featureBuildInfo.dstFolder, 'Dockerfile-with-features');
        await cliHost.writeFile(finalDockerfilePath, Buffer.from(finalDockerfileContent));
        // track additional build args to include below
        for (const buildContext in featureBuildInfo.buildKitContexts) {
            additionalBuildArgs.push('--build-context', `${buildContext}=${featureBuildInfo.buildKitContexts[buildContext]}`);
        }
        for (const buildArg in featureBuildInfo.buildArgs) {
            additionalBuildArgs.push('--build-arg', `${buildArg}=${featureBuildInfo.buildArgs[buildArg]}`);
        }
    }
    const args = [];
    if (buildParams.buildKitVersion) {
        args.push('buildx', 'build', '--load', // (short for --output=docker, i.e. load into normal 'docker images' collection)
        '--build-arg', 'BUILDKIT_INLINE_CACHE=1');
    }
    else {
        args.push('build');
    }
    args.push('-f', finalDockerfilePath, '-t', baseImageName);
    const target = (_c = config.build) === null || _c === void 0 ? void 0 : _c.target;
    if (target) {
        args.push('--target', target);
    }
    if (noCache) {
        args.push('--no-cache', '--pull');
    }
    else {
        if (buildParams.additionalCacheFroms) {
            buildParams.additionalCacheFroms.forEach(cacheFrom => args.push('--cache-from', cacheFrom));
        }
        if (config.build && config.build.cacheFrom) {
            if (typeof config.build.cacheFrom === 'string') {
                args.push('--cache-from', config.build.cacheFrom);
            }
            else {
                for (let index = 0; index < config.build.cacheFrom.length; index++) {
                    const cacheFrom = config.build.cacheFrom[index];
                    args.push('--cache-from', cacheFrom);
                }
            }
        }
    }
    const buildArgs = (_d = config.build) === null || _d === void 0 ? void 0 : _d.args;
    if (buildArgs) {
        for (const key in buildArgs) {
            args.push('--build-arg', `${key}=${buildArgs[key]}`);
        }
    }
    args.push(...additionalBuildArgs);
    args.push(await (0, utils_1.uriToWSLFsPath)((0, utils_1.getDockerContextPath)(cliHost, config), cliHost));
    try {
        if (buildParams.isTTY) {
            const infoParams = { ...(0, dockerUtils_1.toPtyExecParameters)(buildParams), output: (0, log_1.makeLog)(output, log_1.LogLevel.Info) };
            await (0, dockerUtils_1.dockerPtyCLI)(infoParams, ...args);
        }
        else {
            const infoParams = { ...(0, dockerUtils_1.toExecParameters)(buildParams), output: (0, log_1.makeLog)(output, log_1.LogLevel.Info), print: 'continuous' };
            await (0, dockerUtils_1.dockerCLI)(infoParams, ...args);
        }
    }
    catch (err) {
        throw new errors_1.ContainerError({ description: 'An error occurred building the image.', originalError: err, data: { fileWithError: dockerfilePath } });
    }
    const imageDetails = () => (0, utils_1.inspectDockerImage)(buildParams, baseImageName, false);
    return {
        updatedImageName: baseImageName,
        collapsedFeaturesConfig: extendImageBuildInfo === null || extendImageBuildInfo === void 0 ? void 0 : extendImageBuildInfo.collapsedFeaturesConfig,
        imageDetails
    };
}
function findUserArg(runArgs = []) {
    for (let i = runArgs.length - 1; i >= 0; i--) {
        const runArg = runArgs[i];
        if ((runArg === '-u' || runArg === '--user') && i + 1 < runArgs.length) {
            return runArgs[i + 1];
        }
        if (runArg.startsWith('-u=') || runArg.startsWith('--user=')) {
            return runArg.substr(runArg.indexOf('=') + 1);
        }
    }
    return undefined;
}
exports.findUserArg = findUserArg;
async function findExistingContainer(params, labels) {
    const { common } = params;
    let container = await findDevContainer(params, labels);
    if (params.expectExistingContainer && !container) {
        throw new errors_1.ContainerError({ description: 'The expected container does not exist.' });
    }
    if (container && (params.removeOnStartup === true || params.removeOnStartup === container.Id)) {
        const text = 'Removing Existing Container';
        const start = common.output.start(text);
        await (0, dockerUtils_1.dockerCLI)(params, 'rm', '-f', container.Id);
        common.output.stop(text, start);
        container = undefined;
    }
    return container;
}
exports.findExistingContainer = findExistingContainer;
async function startExistingContainer(params, labels, container) {
    const { common } = params;
    const start = container.State.Status !== 'running';
    if (start) {
        const starting = 'Starting container';
        const start = common.output.start(starting);
        await (0, dockerUtils_1.dockerCLI)(params, 'start', container.Id);
        common.output.stop(starting, start);
        let startedContainer = await findDevContainer(params, labels);
        if (!startedContainer) {
            bailOut(common.output, 'Dev container not found.');
        }
    }
    return start;
}
async function findDevContainer(params, labels) {
    const ids = await (0, dockerUtils_1.listContainers)(params, true, labels);
    const details = await (0, dockerUtils_1.inspectContainers)(params, ids);
    return details.filter(container => container.State.Status !== 'removing')[0];
}
exports.findDevContainer = findDevContainer;
async function spawnDevContainer(params, config, collapsedFeaturesConfig, imageName, labels, workspaceMount, imageDetails) {
    const { common } = params;
    common.progress(injectHeadless_1.ResolverProgress.StartingContainer);
    const appPort = config.appPort;
    const exposedPorts = typeof appPort === 'number' || typeof appPort === 'string' ? [appPort] : appPort || [];
    const exposed = [].concat(...exposedPorts.map(port => ['-p', typeof port === 'number' ? `127.0.0.1:${port}:${port}` : port]));
    const cwdMount = workspaceMount ? ['--mount', workspaceMount] : [];
    const mounts = config.mounts ? [].concat(...config.mounts.map(m => ['--mount', m])) : [];
    const envObj = config.containerEnv;
    const containerEnv = envObj ? Object.keys(envObj)
        .reduce((args, key) => {
        args.push('-e', `${key}=${envObj[key]}`);
        return args;
    }, []) : [];
    const containerUser = config.containerUser ? ['-u', config.containerUser] : [];
    const featureArgs = [];
    if (((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || []).some(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.init)) {
        featureArgs.push('--init');
    }
    if (((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || []).some(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.privileged)) {
        featureArgs.push('--privileged');
    }
    const caps = new Set([].concat(...((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
        .filter(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value)
        .map(f => f.capAdd || [])));
    for (const cap of caps) {
        featureArgs.push('--cap-add', cap);
    }
    const securityOpts = new Set([].concat(...((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
        .filter(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value)
        .map(f => f.securityOpt || [])));
    for (const securityOpt of securityOpts) {
        featureArgs.push('--security-opt', securityOpt);
    }
    const featureMounts = [].concat(...[].concat(...((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
        .map(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.mounts)
        .filter(Boolean), params.additionalMounts).map(m => ['--mount', `type=${m.type},src=${m.source},dst=${m.target}`]));
    const customEntrypoints = ((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
        .map(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.entrypoint)
        .filter(Boolean);
    const entrypoint = ['--entrypoint', '/bin/sh'];
    const cmd = ['-c', `echo Container started
trap "exit 0" 15
${customEntrypoints.join('\n')}
exec "$@"
while sleep 1 & wait $!; do :; done`, '-']; // `wait $!` allows for the `trap` to run (synchronous `sleep` would not).
    if (config.overrideCommand === false && imageDetails) {
        const details = await imageDetails();
        cmd.push(...details.Config.Entrypoint || []);
        cmd.push(...details.Config.Cmd || []);
    }
    const args = [
        'run',
        '--sig-proxy=false',
        '-a', 'STDOUT',
        '-a', 'STDERR',
        ...exposed,
        ...cwdMount,
        ...mounts,
        ...featureMounts,
        ...getLabels(labels),
        ...containerEnv,
        ...containerUser,
        ...(config.runArgs || []),
        ...featureArgs,
        ...entrypoint,
        imageName,
        ...cmd
    ];
    let cancel;
    const canceled = new Promise((_, reject) => cancel = reject);
    const { started } = await (0, utils_1.startEventSeen)(params, getLabelsAsRecord(labels), canceled, common.output, common.getLogLevel() === log_1.LogLevel.Trace);
    const text = 'Starting container';
    const start = common.output.start(text);
    const infoParams = { ...(0, dockerUtils_1.toPtyExecParameters)(params), output: (0, log_1.makeLog)(params.common.output, log_1.LogLevel.Info) };
    const result = (0, dockerUtils_1.dockerPtyCLI)(infoParams, ...args);
    result.then(cancel, cancel);
    await started;
    common.output.stop(text, start);
}
exports.spawnDevContainer = spawnDevContainer;
function getLabels(labels) {
    let result = [];
    labels.forEach(each => result.push('-l', each));
    return result;
}
function getLabelsAsRecord(labels) {
    let result = {};
    labels.forEach(each => {
        let pair = each.split('=');
        result[pair[0]] = pair[1];
    });
    return result;
}
function bailOut(output, message) {
    output.write((0, errors_1.toErrorText)(message));
    throw new Error(message);
}
exports.bailOut = bailOut;
