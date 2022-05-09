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
exports.createLog = exports.createDockerParams = exports.launch = void 0;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("./utils");
const injectHeadless_1 = require("../spec-common/injectHeadless");
const commonUtils_1 = require("../spec-common/commonUtils");
const configContainer_1 = require("./configContainer");
const util_1 = require("util");
const log_1 = require("../spec-utils/log");
const dockerCompose_1 = require("./dockerCompose");
async function launch(options, disposables) {
    const params = await createDockerParams(options, disposables);
    const output = params.common.output;
    const text = 'Resolving Remote';
    const start = output.start(text);
    const result = await (0, configContainer_1.resolve)(params, options.configFile, options.overrideConfigFile, options.idLabels);
    output.stop(text, start);
    const { dockerContainerId } = result;
    return {
        containerId: dockerContainerId,
        remoteUser: result.properties.user,
        remoteWorkspaceFolder: result.properties.remoteWorkspaceFolder,
        finishBackgroundTasks: async () => {
            try {
                await (0, injectHeadless_1.finishBackgroundTasks)(result.params.backgroundTasks);
            }
            catch (err) {
                output.write((0, log_1.toErrorText)(String(err && (err.stack || err.message) || err)));
            }
        },
    };
}
exports.launch = launch;
async function createDockerParams(options, disposables) {
    const { persistedFolder, additionalMounts, updateRemoteUserUIDDefault, containerDataFolder, containerSystemDataFolder, workspaceMountConsistency, mountWorkspaceGitRoot, remoteEnv } = options;
    let parsedAuthority;
    if (options.workspaceFolder) {
        parsedAuthority = { hostPath: options.workspaceFolder };
    }
    const extensionPath = path.join(__dirname, '..', '..');
    const sessionStart = new Date();
    const pkg = await (0, utils_1.getPackageConfig)(extensionPath);
    const output = createLog(options, pkg, sessionStart, disposables);
    const appRoot = undefined;
    const cwd = options.workspaceFolder || process.cwd();
    const cliHost = await (0, commonUtils_1.getCLIHost)(cwd, commonUtils_1.loadNativeModule);
    const sessionId = (await (0, util_1.promisify)(crypto.randomBytes)(20)).toString('hex'); // TODO: Somehow enable correlation.
    const common = {
        prebuild: options.prebuild,
        computeExtensionHostEnv: false,
        package: pkg,
        containerDataFolder,
        containerSystemDataFolder,
        appRoot,
        extensionPath,
        sessionId,
        sessionStart,
        cliHost,
        env: cliHost.env,
        cwd,
        isLocalContainer: false,
        progress: () => { },
        output,
        allowSystemConfigChange: true,
        defaultUserEnvProbe: options.defaultUserEnvProbe,
        postCreate: (0, injectHeadless_1.createNullPostCreate)(options.postCreateEnabled, options.skipNonBlocking, output),
        getLogLevel: () => options.logLevel,
        onDidChangeLogLevel: () => ({ dispose() { } }),
        loadNativeModule: commonUtils_1.loadNativeModule,
        shutdowns: [],
        backgroundTasks: [],
        persistedFolder: persistedFolder || await cliHost.tmpdir(),
        remoteEnv,
    };
    const dockerPath = options.dockerPath || 'docker';
    const dockerComposePath = options.dockerComposePath || 'docker-compose';
    return {
        common,
        parsedAuthority,
        dockerCLI: dockerPath,
        dockerComposeCLI: (0, dockerCompose_1.dockerComposeCLIConfig)({
            exec: cliHost.exec,
            env: cliHost.env,
            output: common.output,
        }, dockerPath, dockerComposePath),
        dockerEnv: cliHost.env,
        workspaceMountConsistencyDefault: workspaceMountConsistency,
        mountWorkspaceGitRoot,
        updateRemoteUserUIDOnMacOS: false,
        cacheMount: 'bind',
        removeOnStartup: options.removeExistingContainer,
        buildNoCache: options.buildNoCache,
        expectExistingContainer: options.expectExistingContainer,
        additionalMounts,
        userRepositoryConfigurationPaths: [],
        updateRemoteUserUIDDefault,
        additionalCacheFroms: options.additionalCacheFroms,
    };
}
exports.createDockerParams = createDockerParams;
function createLog(options, pkg, sessionStart, disposables) {
    const header = `${pkg.name} ${pkg.version}.`;
    const output = createLogFrom(options, sessionStart, header);
    output.dimensions = options.terminalDimensions;
    disposables.push(() => output.join());
    return output;
}
exports.createLog = createLog;
function createLogFrom({ log: write, logLevel, logFormat }, sessionStart, header = undefined) {
    const handler = logFormat === 'json' ? (0, log_1.createJSONLog)(write, () => logLevel, sessionStart) : (0, log_1.createTerminalLog)(write, () => logLevel, sessionStart);
    const log = {
        ...(0, log_1.makeLog)((0, log_1.createCombinedLog)([handler], header)),
        join: async () => {
            // TODO: wait for write() to finish.
        },
    };
    return log;
}
