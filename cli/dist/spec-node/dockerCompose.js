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
exports.dockerComposeCLIConfig = exports.getProjectName = exports.findComposeContainer = exports.readDockerComposeConfig = exports.buildDockerCompose = exports.getRemoteWorkspaceFolder = exports.openDockerComposeDevContainer = void 0;
const yaml = __importStar(require("js-yaml"));
const shellQuote = __importStar(require("shell-quote"));
const utils_1 = require("./utils");
const injectHeadless_1 = require("../spec-common/injectHeadless");
const errors_1 = require("../spec-common/errors");
const commonUtils_1 = require("../spec-common/commonUtils");
const dockerUtils_1 = require("../spec-shutdown/dockerUtils");
const configuration_1 = require("../spec-configuration/configuration");
const log_1 = require("../spec-utils/log");
const containerFeatures_1 = require("./containerFeatures");
const product_1 = require("../spec-utils/product");
const projectLabel = 'com.docker.compose.project';
const serviceLabel = 'com.docker.compose.service';
async function openDockerComposeDevContainer(params, workspace, config, idLabels) {
    const { common, dockerCLI, dockerComposeCLI } = params;
    const { cliHost, env, output } = common;
    const buildParams = { cliHost, dockerCLI, dockerComposeCLI, env, output };
    return _openDockerComposeDevContainer(params, buildParams, workspace, config, getRemoteWorkspaceFolder(config), idLabels);
}
exports.openDockerComposeDevContainer = openDockerComposeDevContainer;
async function _openDockerComposeDevContainer(params, buildParams, workspace, config, remoteWorkspaceFolder, idLabels) {
    const { common } = params;
    const { cliHost: buildCLIHost } = buildParams;
    let container;
    let containerProperties;
    try {
        const composeFiles = await (0, configuration_1.getDockerComposeFilePaths)(buildCLIHost, config, buildCLIHost.env, buildCLIHost.cwd);
        const cwdEnvFile = buildCLIHost.path.join(buildCLIHost.cwd, '.env');
        const envFile = Array.isArray(config.dockerComposeFile) && config.dockerComposeFile.length === 0 && await buildCLIHost.isFile(cwdEnvFile) ? cwdEnvFile : undefined;
        const projectName = await getProjectName(buildParams, workspace, composeFiles);
        const containerId = await findComposeContainer(params, projectName, config.service);
        if (params.expectExistingContainer && !containerId) {
            throw new errors_1.ContainerError({ description: 'The expected container does not exist.' });
        }
        container = containerId ? await (0, dockerUtils_1.inspectContainer)(params, containerId) : undefined;
        if (container && (params.removeOnStartup === true || params.removeOnStartup === container.Id)) {
            const text = 'Removing existing container.';
            const start = common.output.start(text);
            await (0, dockerUtils_1.dockerCLI)(params, 'rm', '-f', container.Id);
            common.output.stop(text, start);
            container = undefined;
        }
        // let collapsedFeaturesConfig: CollapsedFeaturesConfig | undefined;
        if (!container || container.State.Status !== 'running') {
            const res = await startContainer(params, buildParams, config, projectName, composeFiles, envFile, container, idLabels);
            container = await (0, dockerUtils_1.inspectContainer)(params, res.containerId);
            // 	collapsedFeaturesConfig = res.collapsedFeaturesConfig;
            // } else {
            // 	const labels = container.Config.Labels || {};
            // 	const featuresConfig = await generateFeaturesConfig(params.common, (await createFeaturesTempFolder(params.common)), config, async () => labels, getContainerFeaturesFolder);
            // 	collapsedFeaturesConfig = collapseFeaturesConfig(featuresConfig);
        }
        containerProperties = await (0, utils_1.createContainerProperties)(params, container.Id, remoteWorkspaceFolder, config.remoteUser);
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
    catch (originalError) {
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
        err.config = config;
        throw err;
    }
}
function getRemoteWorkspaceFolder(config) {
    return config.workspaceFolder || '/';
}
exports.getRemoteWorkspaceFolder = getRemoteWorkspaceFolder;
async function buildDockerCompose(config, projectName, buildParams, localComposeFiles, composeGlobalArgs, runServices, noCache, imageNameOverride, additionalCacheFroms) {
    const { cliHost } = buildParams;
    const args = ['--project-name', projectName, ...composeGlobalArgs];
    if (imageNameOverride || (additionalCacheFroms && additionalCacheFroms.length > 0)) {
        const composeOverrideFile = cliHost.path.join(await cliHost.tmpdir(), `docker-compose.devcontainer.build-${Date.now()}.yml`);
        const imageNameOverrideContent = imageNameOverride ? `    image: ${imageNameOverride}` : '';
        const cacheFromOverrideContent = (additionalCacheFroms && additionalCacheFroms.length > 0) ? `    cache_from: ${additionalCacheFroms.forEach(cacheFrom => `      - ${cacheFrom}`)}` : '';
        const composeOverrideContent = `services:
  ${config.service}:
${imageNameOverrideContent}
${cacheFromOverrideContent}
`;
        await cliHost.writeFile(composeOverrideFile, Buffer.from(composeOverrideContent));
        args.push('-f', composeOverrideFile);
    }
    args.push('build');
    if (noCache) {
        args.push('--no-cache', '--pull');
    }
    if (runServices.length) {
        args.push(...runServices);
        if (runServices.indexOf(config.service) === -1) {
            args.push(config.service);
        }
    }
    try {
        await (0, dockerUtils_1.dockerComposePtyCLI)(buildParams, ...args);
    }
    catch (err) {
        throw err instanceof errors_1.ContainerError ? err : new errors_1.ContainerError({ description: 'An error occurred building the Docker Compose images.', originalError: err, data: { fileWithError: localComposeFiles[0] } });
    }
}
exports.buildDockerCompose = buildDockerCompose;
async function startContainer(params, buildParams, config, projectName, composeFiles, envFile, container, idLabels) {
    var _a, _b, _c, _d;
    const { common } = params;
    const { persistedFolder, output } = common;
    const { cliHost: buildCLIHost } = buildParams;
    const overrideFilePrefix = 'docker-compose.devcontainer.containerFeatures';
    const build = !container;
    common.progress(injectHeadless_1.ResolverProgress.StartingContainer);
    const localComposeFiles = composeFiles;
    // If dockerComposeFile is an array, add -f <file> in order. https://docs.docker.com/compose/extends/#multiple-compose-files
    const composeGlobalArgs = [].concat(...localComposeFiles.map(composeFile => ['-f', composeFile]));
    if (envFile) {
        composeGlobalArgs.push('--env-file', envFile);
    }
    const infoOutput = (0, log_1.makeLog)(buildParams.output, log_1.LogLevel.Info);
    const composeConfig = await readDockerComposeConfig({ ...buildParams, output: infoOutput }, localComposeFiles, envFile);
    const services = Object.keys(composeConfig.services || {});
    if (services.indexOf(config.service) === -1) {
        throw new errors_1.ContainerError({ description: `Service '${config.service}' configured in devcontainer.json not found in Docker Compose configuration.`, data: { fileWithError: composeFiles[0] } });
    }
    let cancel;
    const canceled = new Promise((_, reject) => cancel = reject);
    const { started } = await (0, utils_1.startEventSeen)(params, { [projectLabel]: projectName, [serviceLabel]: config.service }, canceled, common.output, common.getLogLevel() === log_1.LogLevel.Trace); // await getEvents, but only assign started.
    if (build) {
        await buildDockerCompose(config, projectName, { ...buildParams, output: infoOutput }, localComposeFiles, composeGlobalArgs, (_a = config.runServices) !== null && _a !== void 0 ? _a : [], (_b = params.buildNoCache) !== null && _b !== void 0 ? _b : false, undefined, params.additionalCacheFroms);
    }
    const service = composeConfig.services[config.service];
    const originalImageName = service.image || `${projectName}_${config.service}`;
    // Try to restore the 'third' docker-compose file and featuresConfig from persisted storage.
    // This file may have been generated upon a Codespace creation.
    let didRestoreFromPersistedShare = false;
    let collapsedFeaturesConfig = undefined;
    const labels = (_c = container === null || container === void 0 ? void 0 : container.Config) === null || _c === void 0 ? void 0 : _c.Labels;
    output.write(`PersistedPath=${persistedFolder}, ContainerHasLabels=${!!labels}`);
    if (persistedFolder && labels) {
        const configFiles = labels['com.docker.compose.project.config_files'];
        output.write(`Container was created with these config files: ${configFiles}`);
        // Parse out the full name of the 'containerFeatures' configFile
        const files = (_d = configFiles === null || configFiles === void 0 ? void 0 : configFiles.split(',')) !== null && _d !== void 0 ? _d : [];
        const containerFeaturesConfigFile = files.find((f) => f.indexOf(overrideFilePrefix) > -1);
        if (containerFeaturesConfigFile) {
            const composeFileExists = await buildCLIHost.isFile(containerFeaturesConfigFile);
            if (composeFileExists) {
                output.write(`Restoring ${containerFeaturesConfigFile} from persisted storage`);
                didRestoreFromPersistedShare = true;
                // Push path to compose arguments
                composeGlobalArgs.push('-f', containerFeaturesConfigFile);
            }
            else {
                output.write(`Expected ${containerFeaturesConfigFile} to exist, but it did not`, log_1.LogLevel.Error);
            }
        }
        else {
            output.write(`Expected to find a docker-compose file prefixed with ${overrideFilePrefix}, but did not.`, log_1.LogLevel.Error);
        }
    }
    // If features/override docker-compose file hasn't been created yet or a cached version could not be found, generate the file now.
    if (!didRestoreFromPersistedShare) {
        output.write('Generating composeOverrideFile...');
        const { updatedImageName, collapsedFeaturesConfig, imageDetails } = await (0, containerFeatures_1.extendImage)(params, config, originalImageName, !service.build, service.user);
        const composeOverrideContent = await generateFeaturesComposeOverrideContent(updatedImageName, originalImageName, collapsedFeaturesConfig, config, buildParams, composeFiles, imageDetails, service, idLabels, params.additionalMounts);
        const overrideFileHasContents = !!composeOverrideContent && composeOverrideContent.length > 0 && composeOverrideContent.trim() !== '';
        if (overrideFileHasContents) {
            output.write(`Docker Compose override file:\n${composeOverrideContent}`, log_1.LogLevel.Trace);
            // Save override docker-compose file to disk.
            // Persisted folder is a path that will be maintained between sessions
            // Note: As a fallback, persistedFolder is set to the build's tmpDir() directory
            const fileName = `${overrideFilePrefix}-${Date.now()}.yml`;
            const composeFolder = buildCLIHost.path.join(persistedFolder, 'docker-compose');
            const composeOverrideFile = buildCLIHost.path.join(composeFolder, fileName);
            output.write(`Writing ${fileName} to ${composeFolder}`);
            await buildCLIHost.mkdirp(composeFolder);
            await buildCLIHost.writeFile(composeOverrideFile, Buffer.from(composeOverrideContent));
            // Add file path to override file as parameter
            composeGlobalArgs.push('-f', composeOverrideFile);
        }
        else {
            output.write('Override file was generated, but was empty and thus not persisted or included in the docker-compose arguments.');
        }
    }
    const args = ['--project-name', projectName, ...composeGlobalArgs];
    args.push('up', '-d');
    if (params.expectExistingContainer) {
        args.push('--no-recreate');
    }
    if (config.runServices && config.runServices.length) {
        args.push(...config.runServices);
        if (config.runServices.indexOf(config.service) === -1) {
            args.push(config.service);
        }
    }
    try {
        await (0, dockerUtils_1.dockerComposePtyCLI)({ ...buildParams, output: infoOutput }, ...args);
    }
    catch (err) {
        cancel();
        throw new errors_1.ContainerError({ description: 'An error occurred starting Docker Compose up.', originalError: err, data: { fileWithError: localComposeFiles[0] } });
    }
    await started;
    return {
        containerId: (await findComposeContainer(params, projectName, config.service)),
        collapsedFeaturesConfig,
    };
}
async function generateFeaturesComposeOverrideContent(updatedImageName, originalImageName, collapsedFeaturesConfig, config, buildParams, composeFiles, imageDetails, service, additionalLabels, additionalMounts) {
    const { cliHost: buildCLIHost } = buildParams;
    let composeOverrideContent = '';
    const overrideImage = updatedImageName !== originalImageName;
    const featureCaps = [...new Set([].concat(...((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
            .filter(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value)
            .map(f => f.capAdd || [])))];
    const featureSecurityOpts = [...new Set([].concat(...((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
            .filter(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value)
            .map(f => f.securityOpt || [])))];
    const featureMounts = [].concat(...((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
        .map(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.mounts)
        .filter(Boolean), additionalMounts);
    const volumeMounts = featureMounts.filter(m => m.type === 'volume');
    const customEntrypoints = ((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || [])
        .map(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.entrypoint)
        .filter(Boolean);
    const composeEntrypoint = typeof service.entrypoint === 'string' ? shellQuote.parse(service.entrypoint) : service.entrypoint;
    const composeCommand = typeof service.command === 'string' ? shellQuote.parse(service.command) : service.command;
    const userEntrypoint = config.overrideCommand ? [] : composeEntrypoint /* $ already escaped. */
        || ((await imageDetails()).Config.Entrypoint || []).map(c => c.replace(/\$/g, '$$$$')); // $ > $$ to escape docker-compose.yml's interpolation.
    const userCommand = config.overrideCommand ? [] : composeCommand /* $ already escaped. */
        || (composeEntrypoint ? [ /* Ignore image CMD per docker-compose.yml spec. */] : ((await imageDetails()).Config.Cmd || []).map(c => c.replace(/\$/g, '$$$$'))); // $ > $$ to escape docker-compose.yml's interpolation.
    composeOverrideContent = `services:
  '${config.service}':${overrideImage ? `
    image: ${updatedImageName}` : ''}
    entrypoint: ["/bin/sh", "-c", "echo Container started\\n
trap \\"exit 0\\" 15\\n
${customEntrypoints.join('\\n\n')}\\n
exec \\"$$@\\"\\n
while sleep 1 & wait $$!; do :; done", "-"${userEntrypoint.map(a => `, ${JSON.stringify(a)}`).join('')}]${userCommand !== composeCommand ? `
    command: ${JSON.stringify(userCommand)}` : ''}${((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || []).some(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.init) ? `
    init: true` : ''}${((collapsedFeaturesConfig === null || collapsedFeaturesConfig === void 0 ? void 0 : collapsedFeaturesConfig.allFeatures) || []).some(f => (product_1.includeAllConfiguredFeatures || f.included) && f.value && f.privileged) ? `
    privileged: true` : ''}${featureCaps.length ? `
    cap_add:${featureCaps.map(cap => `
      - ${cap}`).join('')}` : ''}${featureSecurityOpts.length ? `
    security_opt:${featureSecurityOpts.map(securityOpt => `
      - ${securityOpt}`).join('')}` : ''}${additionalLabels.length ? `
    labels:${additionalLabels.map(label => `
      - ${label.replace(/\$/g, '$$$$')}`).join('')}` : ''}${featureMounts.length ? `
    volumes:${featureMounts.map(m => `
      - ${m.source}:${m.target}`).join('')}` : ''}${volumeMounts.length ? `
volumes:${volumeMounts.map(m => `
  ${m.source}:${m.external ? '\n    external: true' : ''}`).join('')}` : ''}
`;
    const firstComposeFile = (await buildCLIHost.readFile(composeFiles[0])).toString();
    const version = (/^\s*(version:.*)$/m.exec(firstComposeFile) || [])[1];
    if (version) {
        composeOverrideContent = `${version}

${composeOverrideContent}`;
    }
    return composeOverrideContent;
}
async function readDockerComposeConfig(params, composeFiles, envFile) {
    try {
        const composeGlobalArgs = [].concat(...composeFiles.map(composeFile => ['-f', composeFile]));
        if (envFile) {
            composeGlobalArgs.push('--env-file', envFile);
        }
        const composeCLI = await params.dockerComposeCLI();
        if (((0, commonUtils_1.parseVersion)(composeCLI.version) || [])[0] >= 2) {
            composeGlobalArgs.push('--profile', '*');
        }
        try {
            const { stdout } = await (0, dockerUtils_1.dockerComposeCLI)(params, ...composeGlobalArgs, 'config');
            const stdoutStr = stdout.toString();
            params.output.write(stdoutStr);
            return yaml.load(stdoutStr) || {};
        }
        catch (err) {
            if (!Buffer.isBuffer(err === null || err === void 0 ? void 0 : err.stderr) || (err === null || err === void 0 ? void 0 : err.stderr.toString().indexOf('UnicodeEncodeError')) === -1) {
                throw err;
            }
            // Upstream issues. https://github.com/microsoft/vscode-remote-release/issues/5308
            if (params.cliHost.platform === 'win32') {
                const { cmdOutput } = await (0, dockerUtils_1.dockerComposePtyCLI)({
                    ...params,
                    output: (0, log_1.makeLog)({
                        event: params.output.event,
                        dimensions: {
                            columns: 999999,
                            rows: 1,
                        },
                    }, log_1.LogLevel.Info),
                }, ...composeGlobalArgs, 'config');
                return yaml.load(cmdOutput.replace(log_1.terminalEscapeSequences, '')) || {};
            }
            const { stdout } = await (0, dockerUtils_1.dockerComposeCLI)({
                ...params,
                env: {
                    ...params.env,
                    LANG: 'en_US.UTF-8',
                    LC_CTYPE: 'en_US.UTF-8',
                }
            }, ...composeGlobalArgs, 'config');
            const stdoutStr = stdout.toString();
            params.output.write(stdoutStr);
            return yaml.load(stdoutStr) || {};
        }
    }
    catch (err) {
        throw err instanceof errors_1.ContainerError ? err : new errors_1.ContainerError({ description: 'An error occurred retrieving the Docker Compose configuration.', originalError: err, data: { fileWithError: composeFiles[0] } });
    }
}
exports.readDockerComposeConfig = readDockerComposeConfig;
async function findComposeContainer(params, projectName, serviceName) {
    const list = await (0, dockerUtils_1.listContainers)(params, true, [
        `${projectLabel}=${projectName}`,
        `${serviceLabel}=${serviceName}`
    ]);
    return list && list[0];
}
exports.findComposeContainer = findComposeContainer;
async function getProjectName(params, workspace, composeFiles) {
    const { cliHost } = 'cliHost' in params ? params : params.common;
    const newProjectName = await useNewProjectName(params);
    const envName = toProjectName(cliHost.env.COMPOSE_PROJECT_NAME || '', newProjectName);
    if (envName) {
        return envName;
    }
    try {
        const envPath = cliHost.path.join(cliHost.cwd, '.env');
        const buffer = await cliHost.readFile(envPath);
        const match = /^COMPOSE_PROJECT_NAME=(.+)$/m.exec(buffer.toString());
        const value = match && match[1].trim();
        const envFileName = toProjectName(value || '', newProjectName);
        if (envFileName) {
            return envFileName;
        }
    }
    catch (err) {
        if (!(err && (err.code === 'ENOENT' || err.code === 'EISDIR'))) {
            throw err;
        }
    }
    const configDir = workspace.configFolderPath;
    const workingDir = composeFiles[0] ? cliHost.path.dirname(composeFiles[0]) : cliHost.cwd; // From https://github.com/docker/compose/blob/79557e3d3ab67c3697641d9af91866d7e400cfeb/compose/config/config.py#L290
    if ((0, commonUtils_1.equalPaths)(cliHost.platform, workingDir, cliHost.path.join(configDir, '.devcontainer'))) {
        return toProjectName(`${cliHost.path.basename(configDir)}_devcontainer`, newProjectName);
    }
    return toProjectName(cliHost.path.basename(workingDir), newProjectName);
}
exports.getProjectName = getProjectName;
function toProjectName(basename, newProjectName) {
    // From https://github.com/docker/compose/blob/79557e3d3ab67c3697641d9af91866d7e400cfeb/compose/cli/command.py#L152
    if (!newProjectName) {
        return basename.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    return basename.toLowerCase().replace(/[^-_a-z0-9]/g, '');
}
async function useNewProjectName(params) {
    try {
        const version = (0, commonUtils_1.parseVersion)((await params.dockerComposeCLI()).version);
        if (!version) {
            return true; // Optimistically continue.
        }
        return !(0, commonUtils_1.isEarlierVersion)(version, [1, 21, 0]); // 1.21.0 changed allowed characters in project names (added hyphen and underscore).
    }
    catch (err) {
        return true; // Optimistically continue.
    }
}
function dockerComposeCLIConfig(params, dockerCLICmd, dockerComposeCLICmd) {
    let result;
    return () => {
        return result || (result = (async () => {
            let v2 = false;
            let stdout;
            try {
                stdout = (await (0, dockerUtils_1.dockerComposeCLI)({
                    ...params,
                    cmd: dockerComposeCLICmd,
                }, 'version', '--short')).stdout;
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.code) !== 'ENOENT') {
                    throw err;
                }
                stdout = (await (0, dockerUtils_1.dockerComposeCLI)({
                    ...params,
                    cmd: dockerCLICmd,
                }, 'compose', 'version', '--short')).stdout;
                v2 = true;
            }
            return {
                version: stdout.toString().trim(),
                cmd: v2 ? dockerCLICmd : dockerComposeCLICmd,
                args: v2 ? ['compose'] : [],
            };
        })());
    };
}
exports.dockerComposeCLIConfig = dockerComposeCLIConfig;
