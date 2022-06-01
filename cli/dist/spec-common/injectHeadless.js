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
exports.finishBackgroundTasks = exports.runRemoteCommand = exports.getOSRelease = exports.runPostCreateCommands = exports.probeRemoteEnv = exports.setupInContainer = exports.getSystemVarFolder = exports.getUserDataFolder = exports.findUserInEtcPasswd = exports.getUserFromEtcPasswd = exports.getHomeFolder = exports.getUser = exports.getContainerProperties = exports.createNullPostCreate = exports.ResolverProgress = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const string_decoder_1 = require("string_decoder");
const crypto = __importStar(require("crypto"));
const util_1 = require("util");
const errors_1 = require("./errors");
const shellServer_1 = require("./shellServer");
const commonUtils_1 = require("./commonUtils");
const event_1 = require("../spec-utils/event");
const variableSubstitution_1 = require("./variableSubstitution");
const async_1 = require("./async");
const log_1 = require("../spec-utils/log");
const proc_1 = require("./proc");
var ResolverProgress;
(function (ResolverProgress) {
    ResolverProgress[ResolverProgress["Begin"] = 0] = "Begin";
    ResolverProgress[ResolverProgress["CloningRepository"] = 1] = "CloningRepository";
    ResolverProgress[ResolverProgress["BuildingImage"] = 2] = "BuildingImage";
    ResolverProgress[ResolverProgress["StartingContainer"] = 3] = "StartingContainer";
    ResolverProgress[ResolverProgress["InstallingServer"] = 4] = "InstallingServer";
    ResolverProgress[ResolverProgress["StartingServer"] = 5] = "StartingServer";
    ResolverProgress[ResolverProgress["End"] = 6] = "End";
})(ResolverProgress = exports.ResolverProgress || (exports.ResolverProgress = {}));
function createNullPostCreate(enabled, skipNonBlocking, output) {
    function listener(data) {
        emitter.fire(data.toString());
    }
    const emitter = new event_1.NodeEventEmitter({
        on: () => process.stdin.on('data', listener),
        off: () => process.stdin.off('data', listener),
    });
    process.stdin.setEncoding('utf8');
    return {
        enabled,
        skipNonBlocking,
        output: (0, log_1.makeLog)({
            ...output,
            get dimensions() {
                return output.dimensions;
            },
            event: e => output.event({
                ...e,
                channel: 'postCreate',
            }),
        }),
        onDidInput: emitter.event,
        done: () => { },
    };
}
exports.createNullPostCreate = createNullPostCreate;
const defaultWaitFor = 'updateContentCommand';
async function getContainerProperties(options) {
    let { params, createdAt, startedAt, remoteWorkspaceFolder, containerUser, containerGroup, containerEnv, remoteExec, remotePtyExec, remoteExecAsRoot, rootShellServer } = options;
    let shellServer;
    if (rootShellServer && containerUser === 'root') {
        shellServer = rootShellServer;
    }
    else {
        shellServer = await (0, shellServer_1.launch)(remoteExec, params.output, params.sessionId);
    }
    if (!containerEnv) {
        const PATH = (await shellServer.exec('echo $PATH')).stdout.trim();
        containerEnv = PATH ? { PATH } : {};
    }
    if (!containerUser) {
        containerUser = await getUser(shellServer);
    }
    if (!remoteExecAsRoot && containerUser === 'root') {
        remoteExecAsRoot = remoteExec;
    }
    const osRelease = await getOSRelease(shellServer);
    const passwdUser = await getUserFromEtcPasswd(shellServer, containerUser);
    if (!passwdUser) {
        params.output.write((0, errors_1.toWarningText)(`User ${containerUser} not found in /etc/passwd.`));
    }
    const shell = await getUserShell(containerEnv, passwdUser);
    const homeFolder = await getHomeFolder(containerEnv, passwdUser);
    const userDataFolder = getUserDataFolder(homeFolder, params);
    let rootShellServerP;
    if (rootShellServer) {
        rootShellServerP = Promise.resolve(rootShellServer);
    }
    else if (containerUser === 'root') {
        rootShellServerP = Promise.resolve(shellServer);
    }
    const containerProperties = {
        createdAt,
        startedAt,
        osRelease,
        user: containerUser,
        gid: containerGroup || (passwdUser === null || passwdUser === void 0 ? void 0 : passwdUser.gid),
        env: containerEnv,
        shell,
        homeFolder,
        userDataFolder,
        remoteWorkspaceFolder,
        remoteExec,
        remotePtyExec,
        remoteExecAsRoot,
        shellServer,
    };
    if (rootShellServerP || remoteExecAsRoot) {
        containerProperties.launchRootShellServer = () => rootShellServerP || (rootShellServerP = (0, shellServer_1.launch)(remoteExecAsRoot, params.output));
    }
    return containerProperties;
}
exports.getContainerProperties = getContainerProperties;
async function getUser(shellServer) {
    return (await shellServer.exec('id -un')).stdout.trim();
}
exports.getUser = getUser;
async function getHomeFolder(containerEnv, passwdUser) {
    return containerEnv.HOME || (passwdUser && passwdUser.home) || '/root';
}
exports.getHomeFolder = getHomeFolder;
async function getUserShell(containerEnv, passwdUser) {
    return containerEnv.SHELL || (passwdUser && passwdUser.shell) || '/bin/sh';
}
async function getUserFromEtcPasswd(shellServer, userNameOrId) {
    const { stdout } = await shellServer.exec('cat /etc/passwd', { logOutput: false });
    return findUserInEtcPasswd(stdout, userNameOrId);
}
exports.getUserFromEtcPasswd = getUserFromEtcPasswd;
function findUserInEtcPasswd(etcPasswd, nameOrId) {
    const users = etcPasswd
        .split(/\r?\n/)
        .map(line => line.split(':'))
        .map(row => ({
        name: row[0],
        uid: row[2],
        gid: row[3],
        home: row[5],
        shell: row[6]
    }));
    return users.find(user => user.name === nameOrId || user.uid === nameOrId);
}
exports.findUserInEtcPasswd = findUserInEtcPasswd;
function getUserDataFolder(homeFolder, params) {
    return path.posix.resolve(homeFolder, params.containerDataFolder || '.devcontainer');
}
exports.getUserDataFolder = getUserDataFolder;
function getSystemVarFolder(params) {
    return params.containerSystemDataFolder || '/var/devcontainer';
}
exports.getSystemVarFolder = getSystemVarFolder;
async function setupInContainer(params, containerProperties, config) {
    await patchEtcEnvironment(params, containerProperties);
    await patchEtcProfile(params, containerProperties);
    const computeRemoteEnv = params.computeExtensionHostEnv || params.postCreate.enabled;
    const remoteEnv = computeRemoteEnv ? probeRemoteEnv(params, containerProperties, config) : Promise.resolve({});
    if (params.postCreate.enabled) {
        await runPostCreateCommands(params, containerProperties, config, remoteEnv, false);
    }
    return {
        remoteEnv: params.computeExtensionHostEnv ? await remoteEnv : {},
    };
}
exports.setupInContainer = setupInContainer;
function probeRemoteEnv(params, containerProperties, config) {
    return probeUserEnv(params, containerProperties, config)
        .then(shellEnv => ({
        ...shellEnv,
        ...params.remoteEnv,
        ...config.remoteEnv ? (0, variableSubstitution_1.containerSubstitute)(params.cliHost.platform, config.configFilePath, containerProperties.env, config.remoteEnv) : {},
    }));
}
exports.probeRemoteEnv = probeRemoteEnv;
async function runPostCreateCommands(params, containerProperties, config, remoteEnv, stopForPersonalization) {
    const skipNonBlocking = params.postCreate.skipNonBlocking;
    const waitFor = config.waitFor || defaultWaitFor;
    if (skipNonBlocking && waitFor === 'initializeCommand') {
        return 'skipNonBlocking';
    }
    await runPostCreateCommand(params, containerProperties, config, 'onCreateCommand', remoteEnv, false);
    if (skipNonBlocking && waitFor === 'onCreateCommand') {
        return 'skipNonBlocking';
    }
    await runPostCreateCommand(params, containerProperties, config, 'updateContentCommand', remoteEnv, !!params.prebuild);
    if (skipNonBlocking && waitFor === 'updateContentCommand') {
        return 'skipNonBlocking';
    }
    if (params.prebuild) {
        return 'prebuild';
    }
    await runPostCreateCommand(params, containerProperties, config, 'postCreateCommand', remoteEnv, false);
    if (skipNonBlocking && waitFor === 'postCreateCommand') {
        return 'skipNonBlocking';
    }
    if (stopForPersonalization) {
        return 'stopForPersonalization';
    }
    await runPostStartCommand(params, containerProperties, config, remoteEnv);
    if (skipNonBlocking && waitFor === 'postStartCommand') {
        return 'skipNonBlocking';
    }
    await runPostAttachCommand(params, containerProperties, config, remoteEnv);
    return 'done';
}
exports.runPostCreateCommands = runPostCreateCommands;
async function getOSRelease(shellServer) {
    let hardware = 'unknown';
    let id = 'unknown';
    let version = 'unknown';
    try {
        hardware = (await shellServer.exec('uname -m')).stdout.trim();
        const { stdout } = await shellServer.exec('(cat /etc/os-release || cat /usr/lib/os-release) 2>/dev/null');
        id = (stdout.match(/^ID=([^\u001b\r\n]*)/m) || [])[1] || 'notfound';
        version = (stdout.match(/^VERSION_ID=([^\u001b\r\n]*)/m) || [])[1] || 'notfound';
    }
    catch (err) {
        console.error(err);
        // Optimistically continue.
    }
    return { hardware, id, version };
}
exports.getOSRelease = getOSRelease;
async function runPostCreateCommand(params, containerProperties, config, postCommandName, remoteEnv, rerun) {
    const markerFile = path.posix.join(containerProperties.userDataFolder, `.${postCommandName}Marker`);
    const doRun = !!containerProperties.createdAt && await updateMarkerFile(containerProperties.shellServer, markerFile, containerProperties.createdAt) || rerun;
    await runPostCommand(params, containerProperties, config, postCommandName, remoteEnv, doRun);
}
async function runPostStartCommand(params, containerProperties, config, remoteEnv) {
    const markerFile = path.posix.join(containerProperties.userDataFolder, '.postStartCommandMarker');
    const doRun = !!containerProperties.startedAt && await updateMarkerFile(containerProperties.shellServer, markerFile, containerProperties.startedAt);
    await runPostCommand(params, containerProperties, config, 'postStartCommand', remoteEnv, doRun);
}
async function updateMarkerFile(shellServer, location, content) {
    try {
        await shellServer.exec(`mkdir -p '${path.posix.dirname(location)}' && CONTENT="$(cat '${location}' 2>/dev/null || echo ENOENT)" && [ "\${CONTENT:-${content}}" != '${content}' ] && echo '${content}' > '${location}'`);
        return true;
    }
    catch (err) {
        return false;
    }
}
async function runPostAttachCommand(params, containerProperties, config, remoteEnv) {
    await runPostCommand(params, containerProperties, config, 'postAttachCommand', remoteEnv, true);
}
async function runPostCommand({ postCreate }, containerProperties, config, postCommandName, remoteEnv, doRun) {
    const postCommand = config[postCommandName];
    if (doRun && postCommand && (typeof postCommand === 'string' ? postCommand.trim() : postCommand.length)) {
        const progressName = `Running ${postCommandName}...`;
        const progressDetail = typeof postCommand === 'string' ? postCommand : postCommand.join(' ');
        const infoOutput = (0, log_1.makeLog)({
            event(e) {
                postCreate.output.event(e);
                if (e.type === 'raw' && e.text.includes('::endstep::')) {
                    postCreate.output.event({
                        type: 'progress',
                        name: progressName,
                        status: 'running',
                        stepDetail: ''
                    });
                }
                if (e.type === 'raw' && e.text.includes('::step::')) {
                    postCreate.output.event({
                        type: 'progress',
                        name: progressName,
                        status: 'running',
                        stepDetail: `${e.text.split('::step::')[1].split('\r\n')[0]}`
                    });
                }
            },
            get dimensions() {
                return postCreate.output.dimensions;
            },
            onDidChangeDimensions: postCreate.output.onDidChangeDimensions,
        }, log_1.LogLevel.Info);
        try {
            infoOutput.event({
                type: 'progress',
                name: progressName,
                status: 'running',
                stepDetail: progressDetail
            });
            const remoteCwd = containerProperties.remoteWorkspaceFolder || containerProperties.homeFolder;
            infoOutput.raw(`\x1b[1mRunning the ${postCommandName} from devcontainer.json...\x1b[0m\r\n\r\n`);
            await runRemoteCommand({ ...postCreate, output: infoOutput }, containerProperties, typeof postCommand === 'string' ? ['/bin/sh', '-c', postCommand] : postCommand, remoteCwd, { remoteEnv: await remoteEnv, print: 'continuous' });
            infoOutput.raw('\r\n');
            infoOutput.event({
                type: 'progress',
                name: progressName,
                status: 'succeeded',
            });
        }
        catch (err) {
            infoOutput.event({
                type: 'progress',
                name: progressName,
                status: 'failed',
            });
            if (err && (err.code === 130 || err.signal === 2)) { // SIGINT seen on darwin as code === 130, would also make sense as signal === 2.
                infoOutput.raw(`\r\n\x1b[1m${postCommandName} interrupted.\x1b[0m\r\n\r\n`);
            }
            else {
                if (err === null || err === void 0 ? void 0 : err.code) {
                    infoOutput.write((0, errors_1.toErrorText)(`${postCommandName} failed with exit code ${err.code}. Skipping any further user-provided commands.`));
                }
                throw new errors_1.ContainerError({
                    description: `The ${postCommandName} in the devcontainer.json failed.`,
                    originalError: err,
                });
            }
        }
    }
}
async function createFile(shellServer, location) {
    try {
        await shellServer.exec(createFileCommand(location));
        return true;
    }
    catch (err) {
        return false;
    }
}
function createFileCommand(location) {
    return `test ! -f '${location}' && set -o noclobber && mkdir -p '${path.posix.dirname(location)}' && { > '${location}' ; } 2> /dev/null`;
}
async function runRemoteCommand(params, { remotePtyExec }, cmd, cwd, options = {}) {
    const print = options.print || (options.silent ? 'off' : 'end');
    const p = await remotePtyExec({
        env: options.remoteEnv,
        cwd,
        cmd: cmd[0],
        args: cmd.slice(1),
        output: options.silent ? log_1.nullLog : params.output,
    });
    let cmdOutput = '';
    let doResolveEarly;
    const resolveEarly = new Promise(resolve => {
        doResolveEarly = resolve;
    });
    process.stdin.on('data', data => { p.write(data.toString()); });
    p.onData(chunk => {
        cmdOutput += chunk;
        if (print === 'continuous') {
            params.output.raw(chunk);
        }
        if (options.resolveOn && options.resolveOn.exec(cmdOutput)) {
            doResolveEarly();
        }
    });
    const sub = params.onDidInput && params.onDidInput(data => p.write(data));
    const exit = await Promise.race([p.exit, resolveEarly]);
    if (sub) {
        sub.dispose();
    }
    if (print === 'end') {
        params.output.raw(cmdOutput);
    }
    if (exit && (exit.code || exit.signal)) {
        return Promise.reject({
            message: `Command failed: ${cmd.join(' ')}`,
            cmdOutput,
            code: exit.code,
            signal: exit.signal,
        });
    }
    return {
        cmdOutput,
    };
}
exports.runRemoteCommand = runRemoteCommand;
async function runRemoteCommandNoPty(params, { remoteExec }, cmd, cwd, options = {}) {
    const print = options.print || (options.silent ? 'off' : 'end');
    const p = await remoteExec({
        env: options.remoteEnv,
        cwd,
        cmd: cmd[0],
        args: cmd.slice(1),
        output: options.silent ? log_1.nullLog : params.output,
    });
    const stdout = [];
    const stderr = [];
    const stdoutDecoder = new string_decoder_1.StringDecoder();
    const stderrDecoder = new string_decoder_1.StringDecoder();
    let stdoutStr = '';
    let stderrStr = '';
    let doResolveEarly;
    let doRejectEarly;
    const resolveEarly = new Promise((resolve, reject) => {
        doResolveEarly = resolve;
        doRejectEarly = reject;
    });
    p.stdout.on('data', (chunk) => {
        stdout.push(chunk);
        const str = stdoutDecoder.write(chunk);
        if (print === 'continuous') {
            params.output.write(str.replace(/\r?\n/g, '\r\n'));
        }
        stdoutStr += str;
        if (options.resolveOn && options.resolveOn.exec(stdoutStr)) {
            doResolveEarly();
        }
    });
    p.stderr.on('data', (chunk) => {
        stderr.push(chunk);
        stderrStr += stderrDecoder.write(chunk);
    });
    if (options.stdin instanceof Buffer) {
        p.stdin.write(options.stdin, err => {
            if (err) {
                doRejectEarly(err);
            }
        });
        p.stdin.end();
    }
    else if (options.stdin instanceof fs.ReadStream) {
        options.stdin.pipe(p.stdin);
    }
    const exit = await Promise.race([p.exit, resolveEarly]);
    const stdoutBuf = Buffer.concat(stdout);
    const stderrBuf = Buffer.concat(stderr);
    if (print === 'end') {
        params.output.write(stdoutStr.replace(/\r?\n/g, '\r\n'));
        params.output.write((0, errors_1.toErrorText)(stderrStr));
    }
    const cmdOutput = `${stdoutStr}\n${stderrStr}`;
    if (exit && (exit.code || exit.signal)) {
        return Promise.reject({
            message: `Command failed: ${cmd.join(' ')}`,
            cmdOutput,
            stdout: stdoutBuf,
            stderr: stderrBuf,
            code: exit.code,
            signal: exit.signal,
        });
    }
    return {
        cmdOutput,
        stdout: stdoutBuf,
        stderr: stderrBuf,
    };
}
async function patchEtcEnvironment(params, containerProperties) {
    const markerFile = path.posix.join(getSystemVarFolder(params), `.patchEtcEnvironmentMarker`);
    if (params.allowSystemConfigChange && containerProperties.launchRootShellServer && !(await (0, commonUtils_1.isFile)(containerProperties.shellServer, markerFile))) {
        const rootShellServer = await containerProperties.launchRootShellServer();
        if (await createFile(rootShellServer, markerFile)) {
            await rootShellServer.exec(`cat >> /etc/environment <<'etcEnvrionmentEOF'
${Object.keys(containerProperties.env).map(k => `\n${k}="${containerProperties.env[k]}"`).join('')}
etcEnvrionmentEOF
`);
        }
    }
}
async function patchEtcProfile(params, containerProperties) {
    const markerFile = path.posix.join(getSystemVarFolder(params), `.patchEtcProfileMarker`);
    if (params.allowSystemConfigChange && containerProperties.launchRootShellServer && !(await (0, commonUtils_1.isFile)(containerProperties.shellServer, markerFile))) {
        const rootShellServer = await containerProperties.launchRootShellServer();
        if (await createFile(rootShellServer, markerFile)) {
            await rootShellServer.exec(`sed -i -E 's/((^|\\s)PATH=)([^\\$]*)$/\\1\${PATH:-\\3}/g' /etc/profile || true`);
        }
    }
}
async function probeUserEnv(params, containerProperties, config) {
    const env = await runUserEnvProbe(params, containerProperties, config, 'cat /proc/self/environ', '\0');
    if (env) {
        return env;
    }
    params.output.write('userEnvProbe: falling back to printenv');
    const env2 = await runUserEnvProbe(params, containerProperties, config, 'printenv', '\n');
    return env2 || {};
}
async function runUserEnvProbe(params, containerProperties, config, cmd, sep) {
    var _a;
    let { userEnvProbe } = config || {};
    params.output.write(`userEnvProbe: ${userEnvProbe || params.defaultUserEnvProbe}${userEnvProbe ? '' : ' (default)'}`);
    if (!userEnvProbe) {
        userEnvProbe = params.defaultUserEnvProbe;
    }
    if (userEnvProbe === 'none') {
        return {};
    }
    try {
        // From VS Code's shellEnv.ts
        const buffer = await (0, util_1.promisify)(crypto.randomBytes)(16);
        const mark = buffer.toString('hex');
        const regex = new RegExp(mark + '([^]*)' + mark);
        const systemShellUnix = containerProperties.shell;
        params.output.write(`userEnvProbe shell: ${systemShellUnix}`);
        // handle popular non-POSIX shells
        const name = path.posix.basename(systemShellUnix);
        const command = `echo -n ${mark}; ${cmd}; echo -n ${mark}`;
        let shellArgs;
        if (/^pwsh(-preview)?$/.test(name)) {
            shellArgs = userEnvProbe === 'loginInteractiveShell' || userEnvProbe === 'loginShell' ?
                ['-Login', '-Command'] : // -Login must be the first option.
                ['-Command'];
        }
        else {
            shellArgs = [
                userEnvProbe === 'loginInteractiveShell' ? '-lic' :
                    userEnvProbe === 'loginShell' ? '-lc' :
                        userEnvProbe === 'interactiveShell' ? '-ic' :
                            '-c'
            ];
        }
        const traceOutput = (0, log_1.makeLog)(params.output, log_1.LogLevel.Trace);
        const resultP = runRemoteCommandNoPty({ output: traceOutput }, { remoteExec: containerProperties.remoteExec }, [systemShellUnix, ...shellArgs, command], containerProperties.installFolder);
        Promise.race([resultP, (0, async_1.delay)(2000)])
            .then(async (result) => {
            if (!result) {
                let processes;
                const shellServer = containerProperties.shellServer || await (0, shellServer_1.launch)(containerProperties.remoteExec, params.output);
                try {
                    ({ processes } = await (0, proc_1.findProcesses)(shellServer));
                }
                finally {
                    if (!containerProperties.shellServer) {
                        await shellServer.process.terminate();
                    }
                }
                const shell = processes.find(p => p.cmd.startsWith(systemShellUnix) && p.cmd.indexOf(mark) !== -1);
                if (shell) {
                    const index = (0, proc_1.buildProcessTrees)(processes);
                    const tree = index[shell.pid];
                    params.output.write(`userEnvProbe is taking longer than 2 seconds. Process tree:
${(0, proc_1.processTreeToString)(tree)}`);
                }
                else {
                    params.output.write(`userEnvProbe is taking longer than 2 seconds. Process not found.`);
                }
            }
        }, () => undefined)
            .catch(err => params.output.write((0, errors_1.toErrorText)(err && (err.stack || err.message) || 'Error reading process tree.')));
        const result = await Promise.race([resultP, (0, async_1.delay)(10000)]);
        if (!result) {
            params.output.write((0, errors_1.toErrorText)(`userEnvProbe is taking longer than 10 seconds. Avoid waiting for user input in your shell's startup scripts. Continuing.`));
            return {};
        }
        const raw = result.stdout.toString();
        const match = regex.exec(raw);
        const rawStripped = match ? match[1] : '';
        if (!rawStripped) {
            return undefined; // assume error
        }
        const env = rawStripped.split(sep)
            .reduce((env, e) => {
            const i = e.indexOf('=');
            if (i !== -1) {
                env[e.substring(0, i)] = e.substring(i + 1);
            }
            return env;
        }, {});
        params.output.write(`userEnvProbe parsed: ${JSON.stringify(env, undefined, '  ')}`, log_1.LogLevel.Trace);
        delete env.PWD;
        const shellPath = env.PATH;
        const containerPath = (_a = containerProperties.env) === null || _a === void 0 ? void 0 : _a.PATH;
        const doMergePaths = !(params.allowSystemConfigChange && containerProperties.launchRootShellServer) && shellPath && containerPath;
        if (doMergePaths) {
            const user = containerProperties.user;
            env.PATH = mergePaths(shellPath, containerPath, user === 'root' || user === '0');
        }
        params.output.write(`userEnvProbe PATHs:
Probe:     ${typeof shellPath === 'string' ? `'${shellPath}'` : 'None'}
Container: ${typeof containerPath === 'string' ? `'${containerPath}'` : 'None'}${doMergePaths ? `
Merged:    ${typeof env.PATH === 'string' ? `'${env.PATH}'` : 'None'}` : ''}`);
        return env;
    }
    catch (err) {
        params.output.write((0, errors_1.toErrorText)(err && (err.stack || err.message) || 'Error reading shell environment.'));
        return {};
    }
}
function mergePaths(shellPath, containerPath, rootUser) {
    const result = shellPath.split(':');
    let insertAt = 0;
    for (const entry of containerPath.split(':')) {
        const i = result.indexOf(entry);
        if (i === -1) {
            if (rootUser || !/\/sbin(\/|$)/.test(entry)) {
                result.splice(insertAt++, 0, entry);
            }
        }
        else {
            insertAt = i + 1;
        }
    }
    return result.join(':');
}
async function finishBackgroundTasks(tasks) {
    for (const task of tasks) {
        await (typeof task === 'function' ? task() : task);
    }
}
exports.finishBackgroundTasks = finishBackgroundTasks;
