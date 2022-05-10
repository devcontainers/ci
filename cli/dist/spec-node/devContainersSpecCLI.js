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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const devContainers_1 = require("./devContainers");
const utils_1 = require("./utils");
const vscode_uri_1 = require("vscode-uri");
const errors_1 = require("../spec-common/errors");
const log_1 = require("../spec-utils/log");
const injectHeadless_1 = require("../spec-common/injectHeadless");
const singleContainer_1 = require("./singleContainer");
const containerFeatures_1 = require("./containerFeatures");
const dockerUtils_1 = require("../spec-shutdown/dockerUtils");
const dockerCompose_1 = require("./dockerCompose");
const configuration_1 = require("../spec-configuration/configuration");
const workspaces_1 = require("../spec-utils/workspaces");
const configContainer_1 = require("./configContainer");
const configurationCommonUtils_1 = require("../spec-configuration/configurationCommonUtils");
const cliHost_1 = require("../spec-common/cliHost");
const commonUtils_1 = require("../spec-common/commonUtils");
const containerFeaturesConfiguration_1 = require("../spec-configuration/containerFeaturesConfiguration");
const defaultDefaultUserEnvProbe = 'loginInteractiveShell';
(async () => {
    const argv = process.argv.slice(2);
    const restArgs = argv[0] === 'exec' && argv[1] !== '--help'; // halt-at-non-option doesn't work in subcommands: https://github.com/yargs/yargs/issues/1417
    const y = (0, yargs_1.default)([])
        .parserConfiguration({
        // By default, yargs allows `--no-myoption` to set a boolean `--myoption` to false
        // Disable this to allow `--no-cache` on the `build` command to align with `docker build` syntax
        'boolean-negation': false,
        'halt-at-non-option': restArgs,
    })
        .scriptName('devcontainer')
        .version((await (0, utils_1.getPackageConfig)(path.join(__dirname, '..', '..'))).version)
        .demandCommand()
        .strict();
    y.wrap(Math.min(120, y.terminalWidth()));
    y.command('up', 'Create and run dev container', provisionOptions, provisionHandler);
    y.command('build [path]', 'Build a dev container image', buildOptions, buildHandler);
    y.command('run-user-commands', 'Run user commands', runUserCommandsOptions, runUserCommandsHandler);
    y.command('read-configuration', 'Read configuration', readConfigurationOptions, readConfigurationHandler);
    y.command(restArgs ? ['exec', '*'] : ['exec <cmd> [args..]'], 'Execute a command on a running dev container', execOptions, execHandler);
    y.parse(restArgs ? argv.slice(1) : argv);
})().catch(console.error);
const mountRegex = /^type=(bind|volume),source=([^,]+),target=([^,]+)(?:,external=(true|false))?$/;
function provisionOptions(y) {
    return y.options({
        'docker-path': { type: 'string', description: 'Docker CLI path.' },
        'docker-compose-path': { type: 'string', description: 'Docker Compose CLI path.' },
        'container-data-folder': { type: 'string', description: 'Container data folder where user data inside the container will be stored.' },
        'container-system-data-folder': { type: 'string', description: 'Container system data folder where system data inside the container will be stored.' },
        'workspace-folder': { type: 'string', description: 'Workspace folder path. The devcontainer.json will be looked up relative to this path.' },
        'workspace-mount-consistency': { choices: ['consistent', 'cached', 'delegated'], default: 'cached', description: 'Workspace mount consistency.' },
        'mount-workspace-git-root': { type: 'boolean', default: true, description: 'Mount the workspace using its Git root.' },
        'id-label': { type: 'string', description: 'Id label(s) of the format name=value. These will be set on the container and used to query for an existing container. If no --id-label is given, one will be inferred from the --workspace-folder path.' },
        'config': { type: 'string', description: 'devcontainer.json path. The default is to use .devcontainer/devcontainer.json or, if that does not exist, .devcontainer.json in the workspace folder.' },
        'override-config': { type: 'string', description: 'devcontainer.json path to override any devcontainer.json in the workspace folder (or built-in configuration). This is required when there is no devcontainer.json otherwise.' },
        'log-level': { choices: ['info', 'debug', 'trace'], default: 'info', description: 'Log level for the --terminal-log-file. When set to trace, the log level for --log-file will also be set to trace.' },
        'log-format': { choices: ['text', 'json'], default: 'text', description: 'Log format.' },
        'terminal-columns': { type: 'number', implies: ['terminal-rows'], description: 'Number of rows to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'terminal-rows': { type: 'number', implies: ['terminal-columns'], description: 'Number of columns to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'default-user-env-probe': { choices: ['none', 'loginInteractiveShell', 'interactiveShell', 'loginShell'], default: defaultDefaultUserEnvProbe, description: 'Default value for the devcontainer.json\'s "userEnvProbe".' },
        'update-remote-user-uid-default': { choices: ['never', 'on', 'off'], default: 'on', description: 'Default for updating the remote user\'s UID and GID to the local user\'s one.' },
        'remove-existing-container': { type: 'boolean', default: false, description: 'Removes the dev container if it already exists.' },
        'build-no-cache': { type: 'boolean', default: false, description: 'Builds the image with `--no-cache` if the container does not exist.' },
        'expect-existing-container': { type: 'boolean', default: false, description: 'Fail if the container does not exist.' },
        'skip-post-create': { type: 'boolean', default: false, description: 'Do not run onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand or postAttachCommand and do not install dotfiles.' },
        'skip-non-blocking-commands': { type: 'boolean', default: false, description: 'Stop running user commands after running the command configured with waitFor or the updateContentCommand by default.' },
        prebuild: { type: 'boolean', default: false, description: 'Stop after onCreateCommand and updateContentCommand, rerunning updateContentCommand if it has run before.' },
        'user-data-folder': { type: 'string', description: 'Host path to a directory that is intended to be persisted and share state between sessions.' },
        'mount': { type: 'string', description: 'Additional mount point(s). Format: type=<bind|volume>,source=<source>,target=<target>[,external=<true|false>]' },
        'remote-env': { type: 'string', description: 'Remote environment variables of the format name=value. These will be added when executing the user commands.' },
        'cache-from': { type: 'string', description: 'Additional image to use as potential layer cache during image building' },
        'buildkit': { choices: ['auto', 'never'], default: 'auto', description: 'Control whether BuildKit should be used' },
    })
        .check(argv => {
        const idLabels = (argv['id-label'] && (Array.isArray(argv['id-label']) ? argv['id-label'] : [argv['id-label']]));
        if (idLabels === null || idLabels === void 0 ? void 0 : idLabels.some(idLabel => !/.+=.+/.test(idLabel))) {
            throw new Error('Unmatched argument format: id-label must match <name>=<value>');
        }
        if (!(argv['workspace-folder'] || argv['id-label'])) {
            throw new Error('Missing required argument: workspace-folder or id-label');
        }
        if (!(argv['workspace-folder'] || argv['override-config'])) {
            throw new Error('Missing required argument: workspace-folder or override-config');
        }
        const mounts = (argv.mount && (Array.isArray(argv.mount) ? argv.mount : [argv.mount]));
        if (mounts === null || mounts === void 0 ? void 0 : mounts.some(mount => !mountRegex.test(mount))) {
            throw new Error('Unmatched argument format: mount must match type=<bind|volume>,source=<source>,target=<target>[,external=<true|false>]');
        }
        const remoteEnvs = (argv['remote-env'] && (Array.isArray(argv['remote-env']) ? argv['remote-env'] : [argv['remote-env']]));
        if (remoteEnvs === null || remoteEnvs === void 0 ? void 0 : remoteEnvs.some(remoteEnv => !/.+=.+/.test(remoteEnv))) {
            throw new Error('Unmatched argument format: remote-env must match <name>=<value>');
        }
        return true;
    });
}
function provisionHandler(args) {
    (async () => provision(args))().catch(console.error);
}
async function provision({ 'user-data-folder': persistedFolder, 'docker-path': dockerPath, 'docker-compose-path': dockerComposePath, 'container-data-folder': containerDataFolder, 'container-system-data-folder': containerSystemDataFolder, 'workspace-folder': workspaceFolderArg, 'workspace-mount-consistency': workspaceMountConsistency, 'mount-workspace-git-root': mountWorkspaceGitRoot, 'id-label': idLabel, config, 'override-config': overrideConfig, 'log-level': logLevel, 'log-format': logFormat, 'terminal-rows': terminalRows, 'terminal-columns': terminalColumns, 'default-user-env-probe': defaultUserEnvProbe, 'update-remote-user-uid-default': updateRemoteUserUIDDefault, 'remove-existing-container': removeExistingContainer, 'build-no-cache': buildNoCache, 'expect-existing-container': expectExistingContainer, 'skip-post-create': skipPostCreate, 'skip-non-blocking-commands': skipNonBlocking, prebuild, mount, 'remote-env': addRemoteEnv, 'cache-from': addCacheFrom, 'buildkit': buildkit, }) {
    const workspaceFolder = workspaceFolderArg ? path.resolve(process.cwd(), workspaceFolderArg) : undefined;
    const addRemoteEnvs = addRemoteEnv ? (Array.isArray(addRemoteEnv) ? addRemoteEnv : [addRemoteEnv]) : [];
    const addCacheFroms = addCacheFrom ? (Array.isArray(addCacheFrom) ? addCacheFrom : [addCacheFrom]) : [];
    const options = {
        dockerPath,
        dockerComposePath,
        containerDataFolder,
        containerSystemDataFolder,
        workspaceFolder,
        workspaceMountConsistency,
        mountWorkspaceGitRoot,
        idLabels: idLabel ? (Array.isArray(idLabel) ? idLabel : [idLabel]) : getDefaultIdLabels(workspaceFolder),
        configFile: config ? vscode_uri_1.URI.file(path.resolve(process.cwd(), config)) : undefined,
        overrideConfigFile: overrideConfig ? vscode_uri_1.URI.file(path.resolve(process.cwd(), overrideConfig)) : undefined,
        logLevel: (0, log_1.mapLogLevel)(logLevel),
        logFormat,
        log: text => process.stderr.write(text),
        terminalDimensions: terminalColumns && terminalRows ? { columns: terminalColumns, rows: terminalRows } : undefined,
        defaultUserEnvProbe,
        removeExistingContainer,
        buildNoCache,
        expectExistingContainer,
        postCreateEnabled: !skipPostCreate,
        skipNonBlocking,
        prebuild,
        persistedFolder,
        additionalMounts: mount ? (Array.isArray(mount) ? mount : [mount]).map(mount => {
            const [, type, source, target, external] = mountRegex.exec(mount);
            return {
                type: type,
                source,
                target,
                external: external === 'true'
            };
        }) : [],
        updateRemoteUserUIDDefault,
        remoteEnv: keyValuesToRecord(addRemoteEnvs),
        additionalCacheFroms: addCacheFroms,
        useBuildKit: buildkit,
    };
    const result = await doProvision(options);
    const exitCode = result.outcome === 'error' ? 1 : 0;
    console.log(JSON.stringify(result));
    if (result.outcome === 'success') {
        await result.finishBackgroundTasks();
    }
    await result.dispose();
    process.exit(exitCode);
}
async function doProvision(options) {
    const disposables = [];
    const dispose = async () => {
        await Promise.all(disposables.map(d => d()));
    };
    try {
        const result = await (0, devContainers_1.launch)(options, disposables);
        return {
            outcome: 'success',
            dispose,
            ...result,
        };
    }
    catch (originalError) {
        const originalStack = originalError === null || originalError === void 0 ? void 0 : originalError.stack;
        const err = originalError instanceof errors_1.ContainerError ? originalError : new errors_1.ContainerError({
            description: 'An error occurred setting up the container.',
            originalError
        });
        if (originalStack) {
            console.error(originalStack);
        }
        return {
            outcome: 'error',
            message: err.message,
            description: err.description,
            containerId: err.containerId,
            dispose,
        };
    }
}
function buildOptions(y) {
    return y.options({
        'user-data-folder': { type: 'string', description: 'Host path to a directory that is intended to be persisted and share state between sessions.' },
        'docker-path': { type: 'string', description: 'Docker CLI path.' },
        'docker-compose-path': { type: 'string', description: 'Docker Compose CLI path.' },
        'workspace-folder': { type: 'string', required: true, description: 'Workspace folder path. The devcontainer.json will be looked up relative to this path.' },
        'log-level': { choices: ['info', 'debug', 'trace'], default: 'info', description: 'Log level.' },
        'log-format': { choices: ['text', 'json'], default: 'text', description: 'Log format.' },
        'no-cache': { type: 'boolean', default: false, description: 'Builds the image with `--no-cache`.' },
        'image-name': { type: 'string', description: 'Image name.' },
        'cache-from': { type: 'string', description: 'Additional image to use as potential layer cache' },
        'buildkit': { choices: ['auto', 'never'], default: 'auto', description: 'Control whether BuildKit should be used' },
    });
}
function buildHandler(args) {
    (async () => build(args))().catch(console.error);
}
async function build(args) {
    const result = await doBuild(args);
    const exitCode = result.outcome === 'error' ? 1 : 0;
    console.log(JSON.stringify(result));
    await result.dispose();
    process.exit(exitCode);
}
async function doBuild({ 'user-data-folder': persistedFolder, 'docker-path': dockerPath, 'docker-compose-path': dockerComposePath, 'workspace-folder': workspaceFolderArg, 'log-level': logLevel, 'log-format': logFormat, 'no-cache': buildNoCache, 'image-name': argImageName, 'cache-from': addCacheFrom, 'buildkit': buildkit, }) {
    const disposables = [];
    const dispose = async () => {
        await Promise.all(disposables.map(d => d()));
    };
    try {
        const workspaceFolder = path.resolve(process.cwd(), workspaceFolderArg);
        const configFile = undefined; // TODO
        const overrideConfigFile = undefined;
        const addCacheFroms = addCacheFrom ? (Array.isArray(addCacheFrom) ? addCacheFrom : [addCacheFrom]) : [];
        const params = await (0, devContainers_1.createDockerParams)({
            dockerPath,
            dockerComposePath,
            containerDataFolder: undefined,
            containerSystemDataFolder: undefined,
            workspaceFolder,
            mountWorkspaceGitRoot: false,
            idLabels: getDefaultIdLabels(workspaceFolder),
            configFile,
            overrideConfigFile,
            logLevel: (0, log_1.mapLogLevel)(logLevel),
            logFormat,
            log: text => process.stderr.write(text),
            terminalDimensions: /* terminalColumns && terminalRows ? { columns: terminalColumns, rows: terminalRows } : */ undefined,
            defaultUserEnvProbe: 'loginInteractiveShell',
            removeExistingContainer: false,
            buildNoCache,
            expectExistingContainer: false,
            postCreateEnabled: false,
            skipNonBlocking: false,
            prebuild: false,
            persistedFolder,
            additionalMounts: [],
            updateRemoteUserUIDDefault: 'never',
            remoteEnv: {},
            additionalCacheFroms: addCacheFroms,
            useBuildKit: buildkit
        }, disposables);
        const { common, dockerCLI, dockerComposeCLI } = params;
        const { cliHost, env, output } = common;
        const workspace = (0, workspaces_1.workspaceFromPath)(cliHost.path, workspaceFolder);
        const configPath = configFile ? configFile : workspace
            ? (await (0, configurationCommonUtils_1.getDevContainerConfigPathIn)(cliHost, workspace.configFolderPath)
                || (overrideConfigFile ? (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath) : undefined))
            : overrideConfigFile;
        const configs = configPath && await (0, configContainer_1.readDevContainerConfigFile)(cliHost, workspace, configPath, params.mountWorkspaceGitRoot, output, undefined, overrideConfigFile) || undefined;
        if (!configs) {
            throw new errors_1.ContainerError({ description: `Dev container config (${(0, configurationCommonUtils_1.uriToFsPath)(configFile || (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath), cliHost.platform)}) not found.` });
        }
        const { config } = configs;
        let imageNameResult = '';
        if ((0, utils_1.isDockerFileConfig)(config)) {
            // Build the base image and extend with features etc.
            const { updatedImageName } = await (0, singleContainer_1.buildNamedImageAndExtend)(params, config);
            if (argImageName) {
                await (0, dockerUtils_1.dockerPtyCLI)(params, 'tag', updatedImageName, argImageName);
                imageNameResult = argImageName;
            }
            else {
                imageNameResult = updatedImageName;
            }
        }
        else if ('dockerComposeFile' in config) {
            const cwdEnvFile = cliHost.path.join(cliHost.cwd, '.env');
            const envFile = Array.isArray(config.dockerComposeFile) && config.dockerComposeFile.length === 0 && await cliHost.isFile(cwdEnvFile) ? cwdEnvFile : undefined;
            const composeFiles = await (0, configuration_1.getDockerComposeFilePaths)(cliHost, config, cliHost.env, workspaceFolder);
            // If dockerComposeFile is an array, add -f <file> in order. https://docs.docker.com/compose/extends/#multiple-compose-files
            const composeGlobalArgs = [].concat(...composeFiles.map(composeFile => ['-f', composeFile]));
            if (envFile) {
                composeGlobalArgs.push('--env-file', envFile);
            }
            const projectName = await (0, dockerCompose_1.getProjectName)(params, workspace, composeFiles);
            const buildParams = { cliHost, dockerCLI, dockerComposeCLI, env, output };
            const composeConfig = await (0, dockerCompose_1.readDockerComposeConfig)(buildParams, composeFiles, envFile);
            const services = Object.keys(composeConfig.services || {});
            if (services.indexOf(config.service) === -1) {
                throw new Error(`Service '${config.service}' configured in devcontainer.json not found in Docker Compose configuration.`);
            }
            await (0, dockerCompose_1.buildDockerCompose)(config, projectName, buildParams, composeFiles, composeGlobalArgs, [config.service], params.buildNoCache || false, undefined, addCacheFroms);
            const service = composeConfig.services[config.service];
            const originalImageName = service.image || `${projectName}_${config.service}`;
            const { updatedImageName } = await (0, containerFeatures_1.extendImage)(params, config, originalImageName, !service.build);
            if (argImageName) {
                await (0, dockerUtils_1.dockerPtyCLI)(params, 'tag', updatedImageName, argImageName);
                imageNameResult = argImageName;
            }
            else {
                imageNameResult = updatedImageName;
            }
        }
        else {
            await (0, dockerUtils_1.dockerPtyCLI)(params, 'pull', config.image);
            const { updatedImageName } = await (0, containerFeatures_1.extendImage)(params, config, config.image, 'image' in config);
            if (argImageName) {
                await (0, dockerUtils_1.dockerPtyCLI)(params, 'tag', updatedImageName, argImageName);
                imageNameResult = argImageName;
            }
            else {
                imageNameResult = updatedImageName;
            }
        }
        return {
            outcome: 'success',
            imageName: imageNameResult,
            dispose,
        };
    }
    catch (originalError) {
        const originalStack = originalError === null || originalError === void 0 ? void 0 : originalError.stack;
        const err = originalError instanceof errors_1.ContainerError ? originalError : new errors_1.ContainerError({
            description: 'An error occurred building the container.',
            originalError
        });
        if (originalStack) {
            console.error(originalStack);
        }
        return {
            outcome: 'error',
            message: err.message,
            description: err.description,
            dispose,
        };
    }
}
function runUserCommandsOptions(y) {
    return y.options({
        'user-data-folder': { type: 'string', description: 'Host path to a directory that is intended to be persisted and share state between sessions.' },
        'docker-path': { type: 'string', description: 'Docker CLI path.' },
        'docker-compose-path': { type: 'string', description: 'Docker Compose CLI path.' },
        'container-data-folder': { type: 'string', description: 'Container data folder where user data inside the container will be stored.' },
        'container-system-data-folder': { type: 'string', description: 'Container system data folder where system data inside the container will be stored.' },
        'workspace-folder': { type: 'string', required: true, description: 'Workspace folder path. The devcontainer.json will be looked up relative to this path.' },
        'mount-workspace-git-root': { type: 'boolean', default: true, description: 'Mount the workspace using its Git root.' },
        'container-id': { type: 'string', description: 'Id of the container to run the user commands for.' },
        'id-label': { type: 'string', description: 'Id label(s) of the format name=value. If no --container-id is given the id labels will be used to look up the container. If no --id-label is given, one will be inferred from the --workspace-folder path.' },
        'config': { type: 'string', description: 'devcontainer.json path. The default is to use .devcontainer/devcontainer.json or, if that does not exist, .devcontainer.json in the workspace folder.' },
        'override-config': { type: 'string', description: 'devcontainer.json path to override any devcontainer.json in the workspace folder (or built-in configuration). This is required when there is no devcontainer.json otherwise.' },
        'log-level': { choices: ['info', 'debug', 'trace'], default: 'info', description: 'Log level for the --terminal-log-file. When set to trace, the log level for --log-file will also be set to trace.' },
        'log-format': { choices: ['text', 'json'], default: 'text', description: 'Log format.' },
        'terminal-columns': { type: 'number', implies: ['terminal-rows'], description: 'Number of rows to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'terminal-rows': { type: 'number', implies: ['terminal-columns'], description: 'Number of columns to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'default-user-env-probe': { choices: ['none', 'loginInteractiveShell', 'interactiveShell', 'loginShell'], default: defaultDefaultUserEnvProbe, description: 'Default value for the devcontainer.json\'s "userEnvProbe".' },
        'skip-non-blocking-commands': { type: 'boolean', default: false, description: 'Stop running user commands after running the command configured with waitFor or the updateContentCommand by default.' },
        prebuild: { type: 'boolean', default: false, description: 'Stop after onCreateCommand and updateContentCommand, rerunning updateContentCommand if it has run before.' },
        'stop-for-personalization': { type: 'boolean', default: false, description: 'Stop for personalization.' },
        'remote-env': { type: 'string', description: 'Remote environment variables of the format name=value. These will be added when executing the user commands.' },
    })
        .check(argv => {
        const idLabels = (argv['id-label'] && (Array.isArray(argv['id-label']) ? argv['id-label'] : [argv['id-label']]));
        if (idLabels === null || idLabels === void 0 ? void 0 : idLabels.some(idLabel => !/.+=.+/.test(idLabel))) {
            throw new Error('Unmatched argument format: id-label must match <name>=<value>');
        }
        const remoteEnvs = (argv['remote-env'] && (Array.isArray(argv['remote-env']) ? argv['remote-env'] : [argv['remote-env']]));
        if (remoteEnvs === null || remoteEnvs === void 0 ? void 0 : remoteEnvs.some(remoteEnv => !/.+=.+/.test(remoteEnv))) {
            throw new Error('Unmatched argument format: remote-env must match <name>=<value>');
        }
        return true;
    });
}
function runUserCommandsHandler(args) {
    (async () => runUserCommands(args))().catch(console.error);
}
async function runUserCommands(args) {
    const result = await doRunUserCommands(args);
    const exitCode = result.outcome === 'error' ? 1 : 0;
    console.log(JSON.stringify(result));
    await result.dispose();
    process.exit(exitCode);
}
async function doRunUserCommands({ 'user-data-folder': persistedFolder, 'docker-path': dockerPath, 'docker-compose-path': dockerComposePath, 'container-data-folder': containerDataFolder, 'container-system-data-folder': containerSystemDataFolder, 'workspace-folder': workspaceFolderArg, 'mount-workspace-git-root': mountWorkspaceGitRoot, 'container-id': containerId, 'id-label': idLabel, config: configParam, 'override-config': overrideConfig, 'log-level': logLevel, 'log-format': logFormat, 'terminal-rows': terminalRows, 'terminal-columns': terminalColumns, 'default-user-env-probe': defaultUserEnvProbe, 'skip-non-blocking-commands': skipNonBlocking, prebuild, 'stop-for-personalization': stopForPersonalization, 'remote-env': addRemoteEnv, }) {
    const disposables = [];
    const dispose = async () => {
        await Promise.all(disposables.map(d => d()));
    };
    try {
        const workspaceFolder = path.resolve(process.cwd(), workspaceFolderArg);
        const idLabels = idLabel ? (Array.isArray(idLabel) ? idLabel : [idLabel]) : getDefaultIdLabels(workspaceFolder);
        const addRemoteEnvs = addRemoteEnv ? (Array.isArray(addRemoteEnv) ? addRemoteEnv : [addRemoteEnv]) : [];
        const configFile = configParam ? vscode_uri_1.URI.file(path.resolve(process.cwd(), configParam)) : undefined;
        const overrideConfigFile = overrideConfig ? vscode_uri_1.URI.file(path.resolve(process.cwd(), overrideConfig)) : undefined;
        const params = await (0, devContainers_1.createDockerParams)({
            dockerPath,
            dockerComposePath,
            containerDataFolder,
            containerSystemDataFolder,
            workspaceFolder,
            mountWorkspaceGitRoot,
            idLabels,
            configFile,
            overrideConfigFile,
            logLevel: (0, log_1.mapLogLevel)(logLevel),
            logFormat,
            log: text => process.stderr.write(text),
            terminalDimensions: terminalColumns && terminalRows ? { columns: terminalColumns, rows: terminalRows } : undefined,
            defaultUserEnvProbe,
            removeExistingContainer: false,
            buildNoCache: false,
            expectExistingContainer: false,
            postCreateEnabled: true,
            skipNonBlocking,
            prebuild,
            persistedFolder,
            additionalMounts: [],
            updateRemoteUserUIDDefault: 'never',
            remoteEnv: keyValuesToRecord(addRemoteEnvs),
            additionalCacheFroms: [],
            useBuildKit: 'auto'
        }, disposables);
        const { common } = params;
        const { cliHost, output } = common;
        const workspace = (0, workspaces_1.workspaceFromPath)(cliHost.path, workspaceFolder);
        const configPath = configFile ? configFile : workspace
            ? (await (0, configurationCommonUtils_1.getDevContainerConfigPathIn)(cliHost, workspace.configFolderPath)
                || (overrideConfigFile ? (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath) : undefined))
            : overrideConfigFile;
        const configs = configPath && await (0, configContainer_1.readDevContainerConfigFile)(cliHost, workspace, configPath, params.mountWorkspaceGitRoot, output, undefined, overrideConfigFile) || undefined;
        if (!configs) {
            throw new errors_1.ContainerError({ description: `Dev container config (${(0, configurationCommonUtils_1.uriToFsPath)(configFile || (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath), cliHost.platform)}) not found.` });
        }
        const { config, workspaceConfig } = configs;
        const container = containerId ? await (0, dockerUtils_1.inspectContainer)(params, containerId) : await (0, singleContainer_1.findDevContainer)(params, idLabels);
        if (!container) {
            (0, singleContainer_1.bailOut)(common.output, 'Dev container not found.');
        }
        const containerProperties = await (0, utils_1.createContainerProperties)(params, container.Id, workspaceConfig.workspaceFolder, config.remoteUser);
        const remoteEnv = (0, injectHeadless_1.probeRemoteEnv)(common, containerProperties, config);
        const result = await (0, injectHeadless_1.runPostCreateCommands)(common, containerProperties, config, remoteEnv, stopForPersonalization);
        return {
            outcome: 'success',
            result,
            dispose,
        };
    }
    catch (originalError) {
        const originalStack = originalError === null || originalError === void 0 ? void 0 : originalError.stack;
        const err = originalError instanceof errors_1.ContainerError ? originalError : new errors_1.ContainerError({
            description: 'An error occurred running user commands in the container.',
            originalError
        });
        if (originalStack) {
            console.error(originalStack);
        }
        return {
            outcome: 'error',
            message: err.message,
            description: err.description,
            dispose,
        };
    }
}
function readConfigurationOptions(y) {
    return y.options({
        'user-data-folder': { type: 'string', description: 'Host path to a directory that is intended to be persisted and share state between sessions.' },
        'workspace-folder': { type: 'string', required: true, description: 'Workspace folder path. The devcontainer.json will be looked up relative to this path.' },
        'mount-workspace-git-root': { type: 'boolean', default: true, description: 'Mount the workspace using its Git root.' },
        'config': { type: 'string', description: 'devcontainer.json path. The default is to use .devcontainer/devcontainer.json or, if that does not exist, .devcontainer.json in the workspace folder.' },
        'override-config': { type: 'string', description: 'devcontainer.json path to override any devcontainer.json in the workspace folder (or built-in configuration). This is required when there is no devcontainer.json otherwise.' },
        'log-level': { choices: ['info', 'debug', 'trace'], default: 'info', description: 'Log level for the --terminal-log-file. When set to trace, the log level for --log-file will also be set to trace.' },
        'log-format': { choices: ['text', 'json'], default: 'text', description: 'Log format.' },
        'terminal-columns': { type: 'number', implies: ['terminal-rows'], description: 'Number of rows to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'terminal-rows': { type: 'number', implies: ['terminal-columns'], description: 'Number of columns to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'include-features-configuration': { type: 'boolean', default: false, description: 'Include features configuration.' },
    });
}
function readConfigurationHandler(args) {
    (async () => readConfiguration(args))().catch(console.error);
}
async function readConfiguration({ 
// 'user-data-folder': persistedFolder,
'workspace-folder': workspaceFolderArg, 'mount-workspace-git-root': mountWorkspaceGitRoot, config: configParam, 'override-config': overrideConfig, 'log-level': logLevel, 'log-format': logFormat, 'terminal-rows': terminalRows, 'terminal-columns': terminalColumns, 'include-features-configuration': includeFeaturesConfig, }) {
    const disposables = [];
    const dispose = async () => {
        await Promise.all(disposables.map(d => d()));
    };
    let output;
    try {
        const workspaceFolder = path.resolve(process.cwd(), workspaceFolderArg);
        const configFile = configParam ? vscode_uri_1.URI.file(path.resolve(process.cwd(), configParam)) : undefined;
        const overrideConfigFile = overrideConfig ? vscode_uri_1.URI.file(path.resolve(process.cwd(), overrideConfig)) : undefined;
        const cwd = workspaceFolder || process.cwd();
        const cliHost = await (0, cliHost_1.getCLIHost)(cwd, commonUtils_1.loadNativeModule);
        const extensionPath = path.join(__dirname, '..', '..');
        const sessionStart = new Date();
        const pkg = await (0, utils_1.getPackageConfig)(extensionPath);
        output = (0, devContainers_1.createLog)({
            logLevel: (0, log_1.mapLogLevel)(logLevel),
            logFormat,
            log: text => process.stderr.write(text),
            terminalDimensions: terminalColumns && terminalRows ? { columns: terminalColumns, rows: terminalRows } : undefined,
        }, pkg, sessionStart, disposables);
        const workspace = (0, workspaces_1.workspaceFromPath)(cliHost.path, workspaceFolder);
        const configPath = configFile ? configFile : workspace
            ? (await (0, configurationCommonUtils_1.getDevContainerConfigPathIn)(cliHost, workspace.configFolderPath)
                || (overrideConfigFile ? (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath) : undefined))
            : overrideConfigFile;
        const configs = configPath && await (0, configContainer_1.readDevContainerConfigFile)(cliHost, workspace, configPath, mountWorkspaceGitRoot, output, undefined, overrideConfigFile) || undefined;
        if (!configs) {
            throw new errors_1.ContainerError({ description: `Dev container config (${(0, configurationCommonUtils_1.uriToFsPath)(configFile || (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath), cliHost.platform)}) not found.` });
        }
        const featuresConfiguration = includeFeaturesConfig ? await (0, containerFeaturesConfiguration_1.generateFeaturesConfig)({ extensionPath, output, env: cliHost.env }, (await (0, utils_1.createFeaturesTempFolder)({ cliHost, package: pkg })), configs.config, async () => /* TODO: ? (await imageDetails()).Config.Labels || */ ({}), containerFeaturesConfiguration_1.getContainerFeaturesFolder) : undefined;
        await new Promise((resolve, reject) => {
            process.stdout.write(JSON.stringify({
                configuration: configs.config,
                workspace: configs.workspaceConfig,
                featuresConfiguration,
            }) + '\n', err => err ? reject(err) : resolve());
        });
    }
    catch (err) {
        if (output) {
            output.write(err && (err.stack || err.message) || String(err));
        }
        else {
            console.error(err);
        }
        await dispose();
        process.exit(1);
    }
    await dispose();
    process.exit(0);
}
function execOptions(y) {
    return y.options({
        'user-data-folder': { type: 'string', description: 'Host path to a directory that is intended to be persisted and share state between sessions.' },
        'docker-path': { type: 'string', description: 'Docker CLI path.' },
        'docker-compose-path': { type: 'string', description: 'Docker Compose CLI path.' },
        'container-data-folder': { type: 'string', description: 'Container data folder where user data inside the container will be stored.' },
        'container-system-data-folder': { type: 'string', description: 'Container system data folder where system data inside the container will be stored.' },
        'workspace-folder': { type: 'string', required: true, description: 'Workspace folder path. The devcontainer.json will be looked up relative to this path.' },
        'mount-workspace-git-root': { type: 'boolean', default: true, description: 'Mount the workspace using its Git root.' },
        'container-id': { type: 'string', description: 'Id of the container to run the user commands for.' },
        'id-label': { type: 'string', description: 'Id label(s) of the format name=value. If no --container-id is given the id labels will be used to look up the container. If no --id-label is given, one will be inferred from the --workspace-folder path.' },
        'config': { type: 'string', description: 'devcontainer.json path. The default is to use .devcontainer/devcontainer.json or, if that does not exist, .devcontainer.json in the workspace folder.' },
        'override-config': { type: 'string', description: 'devcontainer.json path to override any devcontainer.json in the workspace folder (or built-in configuration). This is required when there is no devcontainer.json otherwise.' },
        'log-level': { choices: ['info', 'debug', 'trace'], default: 'info', description: 'Log level for the --terminal-log-file. When set to trace, the log level for --log-file will also be set to trace.' },
        'log-format': { choices: ['text', 'json'], default: 'text', description: 'Log format.' },
        'terminal-columns': { type: 'number', implies: ['terminal-rows'], description: 'Number of rows to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'terminal-rows': { type: 'number', implies: ['terminal-columns'], description: 'Number of columns to render the output for. This is required for some of the subprocesses to correctly render their output.' },
        'default-user-env-probe': { choices: ['none', 'loginInteractiveShell', 'interactiveShell', 'loginShell'], default: defaultDefaultUserEnvProbe, description: 'Default value for the devcontainer.json\'s "userEnvProbe".' },
        'remote-env': { type: 'string', description: 'Remote environment variables of the format name=value. These will be added when executing the user commands.' },
    })
        .positional('cmd', {
        type: 'string',
        description: 'Command to execute.',
        demandOption: true,
    }).positional('args', {
        type: 'string',
        array: true,
        description: 'Arguments to the command.',
        demandOption: true,
    })
        .check(argv => {
        const idLabels = (argv['id-label'] && (Array.isArray(argv['id-label']) ? argv['id-label'] : [argv['id-label']]));
        if (idLabels === null || idLabels === void 0 ? void 0 : idLabels.some(idLabel => !/.+=.+/.test(idLabel))) {
            throw new Error('Unmatched argument format: id-label must match <name>=<value>');
        }
        const remoteEnvs = (argv['remote-env'] && (Array.isArray(argv['remote-env']) ? argv['remote-env'] : [argv['remote-env']]));
        if (remoteEnvs === null || remoteEnvs === void 0 ? void 0 : remoteEnvs.some(remoteEnv => !/.+=.+/.test(remoteEnv))) {
            throw new Error('Unmatched argument format: remote-env must match <name>=<value>');
        }
        return true;
    });
}
function execHandler(args) {
    (async () => exec(args))().catch(console.error);
}
async function exec(args) {
    const result = await doExec(args);
    const exitCode = result.outcome === 'error' ? 1 : 0;
    console.log(JSON.stringify(result));
    await result.dispose();
    process.exit(exitCode);
}
async function doExec({ 'user-data-folder': persistedFolder, 'docker-path': dockerPath, 'docker-compose-path': dockerComposePath, 'container-data-folder': containerDataFolder, 'container-system-data-folder': containerSystemDataFolder, 'workspace-folder': workspaceFolderArg, 'mount-workspace-git-root': mountWorkspaceGitRoot, 'container-id': containerId, 'id-label': idLabel, config: configParam, 'override-config': overrideConfig, 'log-level': logLevel, 'log-format': logFormat, 'terminal-rows': terminalRows, 'terminal-columns': terminalColumns, 'default-user-env-probe': defaultUserEnvProbe, 'remote-env': addRemoteEnv, _: restArgs, }) {
    const disposables = [];
    const dispose = async () => {
        await Promise.all(disposables.map(d => d()));
    };
    try {
        const workspaceFolder = path.resolve(process.cwd(), workspaceFolderArg);
        const idLabels = idLabel ? (Array.isArray(idLabel) ? idLabel : [idLabel]) : getDefaultIdLabels(workspaceFolder);
        const addRemoteEnvs = addRemoteEnv ? (Array.isArray(addRemoteEnv) ? addRemoteEnv : [addRemoteEnv]) : [];
        const configFile = configParam ? vscode_uri_1.URI.file(path.resolve(process.cwd(), configParam)) : undefined;
        const overrideConfigFile = overrideConfig ? vscode_uri_1.URI.file(path.resolve(process.cwd(), overrideConfig)) : undefined;
        const params = await (0, devContainers_1.createDockerParams)({
            dockerPath,
            dockerComposePath,
            containerDataFolder,
            containerSystemDataFolder,
            workspaceFolder,
            mountWorkspaceGitRoot,
            idLabels,
            configFile,
            overrideConfigFile,
            logLevel: (0, log_1.mapLogLevel)(logLevel),
            logFormat,
            log: text => process.stderr.write(text),
            terminalDimensions: terminalColumns && terminalRows ? { columns: terminalColumns, rows: terminalRows } : undefined,
            defaultUserEnvProbe,
            removeExistingContainer: false,
            buildNoCache: false,
            expectExistingContainer: false,
            postCreateEnabled: true,
            skipNonBlocking: false,
            prebuild: false,
            persistedFolder,
            additionalMounts: [],
            updateRemoteUserUIDDefault: 'never',
            remoteEnv: keyValuesToRecord(addRemoteEnvs),
            additionalCacheFroms: [],
            useBuildKit: 'auto'
        }, disposables);
        const { common } = params;
        const { cliHost, output } = common;
        const workspace = (0, workspaces_1.workspaceFromPath)(cliHost.path, workspaceFolder);
        const configPath = configFile ? configFile : workspace
            ? (await (0, configurationCommonUtils_1.getDevContainerConfigPathIn)(cliHost, workspace.configFolderPath)
                || (overrideConfigFile ? (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath) : undefined))
            : overrideConfigFile;
        const configs = configPath && await (0, configContainer_1.readDevContainerConfigFile)(cliHost, workspace, configPath, params.mountWorkspaceGitRoot, output, undefined, overrideConfigFile) || undefined;
        if (!configs) {
            throw new errors_1.ContainerError({ description: `Dev container config (${(0, configurationCommonUtils_1.uriToFsPath)(configFile || (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath), cliHost.platform)}) not found.` });
        }
        const { config, workspaceConfig } = configs;
        const container = containerId ? await (0, dockerUtils_1.inspectContainer)(params, containerId) : await (0, singleContainer_1.findDevContainer)(params, idLabels);
        if (!container) {
            (0, singleContainer_1.bailOut)(common.output, 'Dev container not found.');
        }
        const containerProperties = await (0, utils_1.createContainerProperties)(params, container.Id, workspaceConfig.workspaceFolder, config.remoteUser);
        const remoteEnv = (0, injectHeadless_1.probeRemoteEnv)(common, containerProperties, config);
        const remoteCwd = containerProperties.remoteWorkspaceFolder || containerProperties.homeFolder;
        const infoOutput = (0, log_1.makeLog)(output, log_1.LogLevel.Info);
        await (0, injectHeadless_1.runRemoteCommand)({ ...common, output: infoOutput }, containerProperties, restArgs || [], remoteCwd, { remoteEnv: await remoteEnv, print: 'continuous' });
        return {
            outcome: 'success',
            dispose,
        };
    }
    catch (originalError) {
        const originalStack = originalError === null || originalError === void 0 ? void 0 : originalError.stack;
        const err = originalError instanceof errors_1.ContainerError ? originalError : new errors_1.ContainerError({
            description: 'An error occurred running a command in the container.',
            originalError
        });
        if (originalStack) {
            console.error(originalStack);
        }
        return {
            outcome: 'error',
            message: err.message,
            description: err.description,
            containerId: err.containerId,
            dispose,
        };
    }
}
function keyValuesToRecord(keyValues) {
    return keyValues.reduce((envs, env) => {
        const i = env.indexOf('=');
        if (i !== -1) {
            envs[env.substring(0, i)] = env.substring(i + 1);
        }
        return envs;
    }, {});
}
function getDefaultIdLabels(workspaceFolder) {
    return [`${singleContainer_1.hostFolderLabel}=${workspaceFolder}`];
}
