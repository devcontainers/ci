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
exports.ensureDockerfileHasFinalStageName = exports.createFeaturesTempFolder = exports.getFolderHash = exports.getFolderImageName = exports.runUserCommand = exports.createContainerProperties = exports.getDockerContextPath = exports.getTunnelInformation = exports.getWorkspaceConfiguration = exports.getHostMountFolder = exports.isDevContainerAuthority = exports.inspectDockerImage = exports.startEventSeen = exports.uriToWSLFsPath = exports.getPackageConfig = exports.RemoteDocuments = exports.fileDocuments = exports.createDocuments = exports.CLIHostDocuments = exports.parentURI = exports.uriToFsPath = exports.resolveConfigFilePath = exports.isDockerFileConfig = exports.getDockerfilePath = exports.getConfigFilePath = void 0;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const errors_1 = require("../spec-common/errors");
const commonUtils_1 = require("../spec-common/commonUtils");
const log_1 = require("../spec-utils/log");
const injectHeadless_1 = require("../spec-common/injectHeadless");
const dockerUtils_1 = require("../spec-shutdown/dockerUtils");
const dockerCompose_1 = require("./dockerCompose");
const git_1 = require("../spec-common/git");
const configurationCommonUtils_1 = require("../spec-configuration/configurationCommonUtils");
const configuration_1 = require("../spec-configuration/configuration");
const string_decoder_1 = require("string_decoder");
var configuration_2 = require("../spec-configuration/configuration");
Object.defineProperty(exports, "getConfigFilePath", { enumerable: true, get: function () { return configuration_2.getConfigFilePath; } });
Object.defineProperty(exports, "getDockerfilePath", { enumerable: true, get: function () { return configuration_2.getDockerfilePath; } });
Object.defineProperty(exports, "isDockerFileConfig", { enumerable: true, get: function () { return configuration_2.isDockerFileConfig; } });
Object.defineProperty(exports, "resolveConfigFilePath", { enumerable: true, get: function () { return configuration_2.resolveConfigFilePath; } });
var configurationCommonUtils_2 = require("../spec-configuration/configurationCommonUtils");
Object.defineProperty(exports, "uriToFsPath", { enumerable: true, get: function () { return configurationCommonUtils_2.uriToFsPath; } });
Object.defineProperty(exports, "parentURI", { enumerable: true, get: function () { return configurationCommonUtils_2.parentURI; } });
var editableFiles_1 = require("../spec-configuration/editableFiles");
Object.defineProperty(exports, "CLIHostDocuments", { enumerable: true, get: function () { return editableFiles_1.CLIHostDocuments; } });
Object.defineProperty(exports, "createDocuments", { enumerable: true, get: function () { return editableFiles_1.createDocuments; } });
Object.defineProperty(exports, "fileDocuments", { enumerable: true, get: function () { return editableFiles_1.fileDocuments; } });
Object.defineProperty(exports, "RemoteDocuments", { enumerable: true, get: function () { return editableFiles_1.RemoteDocuments; } });
var product_1 = require("../spec-utils/product");
Object.defineProperty(exports, "getPackageConfig", { enumerable: true, get: function () { return product_1.getPackageConfig; } });
async function uriToWSLFsPath(uri, cliHost) {
    if (uri.scheme === 'file' && cliHost.type === 'wsl') {
        // convert local path (e.g. repository-container Dockerfile) to WSL path
        const { stdout } = await (0, commonUtils_1.runCommandNoPty)({
            exec: cliHost.exec,
            cmd: 'wslpath',
            args: ['-u', uri.fsPath],
            output: log_1.nullLog,
        });
        const cliHostPath = stdout.toString().trim();
        return cliHostPath;
    }
    return (0, configurationCommonUtils_1.uriToFsPath)(uri, cliHost.platform);
}
exports.uriToWSLFsPath = uriToWSLFsPath;
async function startEventSeen(params, labels, canceled, output, trace) {
    const eventsProcess = await (0, dockerUtils_1.getEvents)(params, { event: ['start'] });
    return {
        started: new Promise((resolve, reject) => {
            canceled.catch(err => {
                eventsProcess.terminate();
                reject(err);
            });
            const decoder = new string_decoder_1.StringDecoder('utf8');
            let startPart = '';
            eventsProcess.stdout.on('data', async (chunk) => {
                if (chunk) {
                    const part = decoder.write(chunk);
                    if (trace) {
                        output.write(`Log: startEventSeen#data ${part.trim().replace(/\r?\n/g, '\r\n')}\r\n`);
                    }
                    const lines = (startPart + part).split('\n');
                    startPart = lines.pop();
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const info = JSON.parse(line);
                                // Docker uses 'status', Podman 'Status'.
                                if ((info.status || info.Status) === 'start' && await hasLabels(params, info, labels)) {
                                    eventsProcess.terminate();
                                    resolve();
                                }
                            }
                            catch (e) {
                                // Ignore invalid JSON.
                                console.error(e);
                                console.error(line);
                            }
                        }
                    }
                }
            });
        })
    };
}
exports.startEventSeen = startEventSeen;
async function hasLabels(params, info, expectedLabels) {
    var _a;
    const actualLabels = ((_a = info.Actor) === null || _a === void 0 ? void 0 : _a.Attributes)
        // Docker uses 'id', Podman 'ID'.
        || (await (0, dockerUtils_1.inspectContainer)(params, info.id || info.ID)).Config.Labels
        || {};
    return Object.keys(expectedLabels)
        .every(name => actualLabels[name] === expectedLabels[name]);
}
async function inspectDockerImage(params, imageName, pullImageOnError) {
    try {
        return await (0, dockerUtils_1.inspectImage)(params, imageName);
    }
    catch (err) {
        if (!pullImageOnError) {
            throw err;
        }
        try {
            await (0, dockerUtils_1.dockerPtyCLI)(params, 'pull', imageName);
        }
        catch (_err) {
            if (err.stdout) {
                params.common.output.write(err.stdout.toString());
            }
            if (err.stderr) {
                params.common.output.write((0, errors_1.toErrorText)(err.stderr.toString()));
            }
            throw err;
        }
        return (0, dockerUtils_1.inspectImage)(params, imageName);
    }
}
exports.inspectDockerImage = inspectDockerImage;
function isDevContainerAuthority(authority) {
    return authority.hostPath !== undefined;
}
exports.isDevContainerAuthority = isDevContainerAuthority;
async function getHostMountFolder(cliHost, folderPath, mountWorkspaceGitRoot, output) {
    return mountWorkspaceGitRoot && await (0, git_1.findGitRootFolder)(cliHost, folderPath, output) || folderPath;
}
exports.getHostMountFolder = getHostMountFolder;
async function getWorkspaceConfiguration(cliHost, workspace, config, mountWorkspaceGitRoot, output, consistency) {
    if ('dockerComposeFile' in config) {
        return {
            workspaceFolder: (0, dockerCompose_1.getRemoteWorkspaceFolder)(config),
            workspaceMount: undefined,
        };
    }
    let { workspaceFolder, workspaceMount } = config;
    if (workspace && (!workspaceFolder || !('workspaceMount' in config))) {
        const hostMountFolder = await getHostMountFolder(cliHost, workspace.rootFolderPath, mountWorkspaceGitRoot, output);
        if (!workspaceFolder) {
            const rel = cliHost.path.relative(cliHost.path.dirname(hostMountFolder), workspace.rootFolderPath);
            workspaceFolder = `/workspaces/${cliHost.platform === 'win32' ? rel.replace(/\\/g, '/') : rel}`;
        }
        if (!('workspaceMount' in config)) {
            const containerMountFolder = `/workspaces/${cliHost.path.basename(hostMountFolder)}`;
            const cons = cliHost.platform !== 'linux' ? `,consistency=${consistency || 'consistent'}` : ''; // Podman does not tolerate consistency=
            const srcQuote = hostMountFolder.indexOf(',') !== -1 ? '"' : '';
            const tgtQuote = containerMountFolder.indexOf(',') !== -1 ? '"' : '';
            workspaceMount = `type=bind,${srcQuote}source=${hostMountFolder}${srcQuote},${tgtQuote}target=${containerMountFolder}${tgtQuote}${cons}`;
        }
    }
    return {
        workspaceFolder,
        workspaceMount,
    };
}
exports.getWorkspaceConfiguration = getWorkspaceConfiguration;
function getTunnelInformation(container) {
    return {
        environmentTunnels: container.Ports.filter(staticPort => !!staticPort.PublicPort)
            .map((port) => {
            return {
                remoteAddress: {
                    port: port.PrivatePort,
                    host: port.IP
                },
                localAddress: port.IP + ':' + port.PublicPort
            };
        })
    };
}
exports.getTunnelInformation = getTunnelInformation;
function getDockerContextPath(cliHost, config) {
    const context = 'dockerFile' in config ? config.context : config.build.context;
    if (context) {
        return (0, configuration_1.getConfigFilePath)(cliHost, config, context);
    }
    return (0, configurationCommonUtils_1.parentURI)((0, configuration_1.getDockerfilePath)(cliHost, config));
}
exports.getDockerContextPath = getDockerContextPath;
async function createContainerProperties(params, containerId, remoteWorkspaceFolder, remoteUser, rootShellServer) {
    const { common } = params;
    const inspecting = 'Inspecting container';
    const start = common.output.start(inspecting);
    const containerInfo = await (0, dockerUtils_1.inspectContainer)(params, containerId);
    common.output.stop(inspecting, start);
    const containerUser = remoteUser || containerInfo.Config.User || 'root';
    const [, user, , group] = /([^:]*)(:(.*))?/.exec(containerUser);
    const containerEnv = envListToObj(containerInfo.Config.Env);
    const remoteExec = (0, dockerUtils_1.dockerExecFunction)(params, containerId, containerUser);
    const remotePtyExec = await (0, dockerUtils_1.dockerPtyExecFunction)(params, containerId, containerUser, common.loadNativeModule);
    const remoteExecAsRoot = (0, dockerUtils_1.dockerExecFunction)(params, containerId, 'root');
    return (0, injectHeadless_1.getContainerProperties)({
        params: common,
        createdAt: containerInfo.Created,
        startedAt: containerInfo.State.StartedAt,
        remoteWorkspaceFolder,
        containerUser: user === '0' ? 'root' : user,
        containerGroup: group,
        containerEnv,
        remoteExec,
        remotePtyExec,
        remoteExecAsRoot,
        rootShellServer,
    });
}
exports.createContainerProperties = createContainerProperties;
function envListToObj(list) {
    // Handle Env is null (https://github.com/microsoft/vscode-remote-release/issues/2058).
    return (list || []).reduce((obj, pair) => {
        const i = pair.indexOf('=');
        if (i !== -1) {
            obj[pair.substr(0, i)] = pair.substr(i + 1);
        }
        return obj;
    }, {});
}
async function runUserCommand(params, command, onDidInput) {
    if (!command) {
        return;
    }
    const { common, dockerEnv } = params;
    const { cliHost, output } = common;
    const isWindows = cliHost.platform === 'win32';
    const shell = isWindows ? [cliHost.env.ComSpec || 'cmd.exe', '/c'] : ['/bin/sh', '-c'];
    const updatedCommand = isWindows && Array.isArray(command) && command.length ?
        [(command[0] || '').replace(/\//g, '\\'), ...command.slice(1)] :
        command;
    const args = typeof updatedCommand === 'string' ? [...shell, updatedCommand] : updatedCommand;
    if (!args.length) {
        return;
    }
    const postCommandName = 'initializeCommand';
    const infoOutput = (0, log_1.makeLog)(output, log_1.LogLevel.Info);
    try {
        infoOutput.raw(`\x1b[1mRunning the ${postCommandName} from devcontainer.json...\x1b[0m\r\n\r\n`);
        await (0, commonUtils_1.runCommand)({
            ptyExec: cliHost.ptyExec,
            cmd: args[0],
            args: args.slice(1),
            env: dockerEnv,
            output: infoOutput,
            onDidInput,
        });
        infoOutput.raw('\r\n');
    }
    catch (err) {
        if (err && (err.code === 130 || err.signal === 2)) { // SIGINT seen on darwin as code === 130, would also make sense as signal === 2.
            infoOutput.raw(`\r\n\x1b[1m${postCommandName} interrupted.\x1b[0m\r\n\r\n`);
        }
        else {
            throw new errors_1.ContainerError({
                description: `The ${postCommandName} in the devcontainer.json failed.`,
                originalError: err,
            });
        }
    }
}
exports.runUserCommand = runUserCommand;
function getFolderImageName(params) {
    const { cwd } = 'cwd' in params ? params : params.cliHost;
    const folderHash = getFolderHash(cwd);
    const baseName = path.basename(cwd);
    return (0, dockerUtils_1.toDockerImageName)(`vsc-${baseName}-${folderHash}`);
}
exports.getFolderImageName = getFolderImageName;
function getFolderHash(fsPath) {
    return crypto.createHash('md5').update(fsPath).digest('hex');
}
exports.getFolderHash = getFolderHash;
async function createFeaturesTempFolder(params) {
    const { cliHost } = params;
    const { version } = params.package;
    // Create temp folder
    const tmpFolder = cliHost.path.join(await cliHost.tmpdir(), 'vsch', 'container-features', `${version}-${Date.now()}`);
    await cliHost.mkdirp(tmpFolder);
    return tmpFolder;
}
exports.createFeaturesTempFolder = createFeaturesTempFolder;
// not expected to be called externally (exposed for testing)
function ensureDockerfileHasFinalStageName(dockerfile, defaultLastStageName) {
    var _a, _b;
    // Find the last line that starts with "FROM" (possibly preceeded by white-space)
    const fromLines = [...dockerfile.matchAll(new RegExp(/^(?<line>\s*FROM.*)/, 'gm'))];
    const lastFromLineMatch = fromLines[fromLines.length - 1];
    const lastFromLine = (_a = lastFromLineMatch.groups) === null || _a === void 0 ? void 0 : _a.line;
    // Test for "FROM [--platform=someplat] base [as label]"
    // That is, match against optional platform and label
    const fromMatch = lastFromLine.match(/FROM\s+(?<platform>--platform=\S+\s+)?\S+(\s+[Aa][Ss]\s+(?<label>[^\s]+))?/);
    if (!fromMatch) {
        throw new Error('Error parsing Dockerfile: failed to parse final FROM line');
    }
    if ((_b = fromMatch.groups) === null || _b === void 0 ? void 0 : _b.label) {
        return {
            lastStageName: fromMatch.groups.label,
            modifiedDockerfile: undefined,
        };
    }
    // Last stage doesn't have a name, so modify the Dockerfile to set the name to defaultLastStageName
    const lastLineStartIndex = lastFromLineMatch.index + fromMatch.index;
    const lastLineEndIndex = lastLineStartIndex + lastFromLine.length;
    const matchedFromText = fromMatch[0];
    let modifiedDockerfile = dockerfile.slice(0, lastLineStartIndex + matchedFromText.length);
    modifiedDockerfile += ` AS ${defaultLastStageName}`;
    const remainingFromLineLength = lastFromLine.length - matchedFromText.length;
    modifiedDockerfile += dockerfile.slice(lastLineEndIndex - remainingFromLineLength);
    return { lastStageName: defaultLastStageName, modifiedDockerfile: modifiedDockerfile };
}
exports.ensureDockerfileHasFinalStageName = ensureDockerfileHasFinalStageName;
