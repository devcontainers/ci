"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDockerImageName = exports.toPtyExecParameters = exports.toExecParameters = exports.dockerPtyExecFunction = exports.dockerExecFunction = exports.dockerComposePtyCLI = exports.dockerComposeCLI = exports.dockerPtyCLI = exports.isPodman = exports.dockerContext = exports.dockerCLI = exports.dockerBuildKitVersion = exports.getEvents = exports.createVolume = exports.listVolumes = exports.listContainers = exports.inspectVolumes = exports.inspectVolume = exports.inspectImage = exports.inspectContainers = exports.inspectContainer = void 0;
const commonUtils_1 = require("../spec-common/commonUtils");
const errors_1 = require("../spec-common/errors");
const log_1 = require("../spec-utils/log");
async function inspectContainer(params, id) {
    return (await inspectContainers(params, [id]))[0];
}
exports.inspectContainer = inspectContainer;
async function inspectContainers(params, ids) {
    const results = await inspect(params, 'container', ids);
    for (const result of results) {
        result.Ports = [];
        const rawPorts = result.NetworkSettings.Ports;
        for (const privatePortAndType in rawPorts) {
            const [PrivatePort, Type] = privatePortAndType.split('/');
            for (const targetPort of rawPorts[privatePortAndType] || []) {
                const { HostIp: IP, HostPort: PublicPort } = targetPort;
                result.Ports.push({
                    IP,
                    PrivatePort: parseInt(PrivatePort),
                    PublicPort: parseInt(PublicPort),
                    Type
                });
            }
        }
    }
    return results;
}
exports.inspectContainers = inspectContainers;
async function inspectImage(params, id) {
    return (await inspect(params, 'image', [id]))[0];
}
exports.inspectImage = inspectImage;
async function inspectVolume(params, name) {
    return (await inspect(params, 'volume', [name]))[0];
}
exports.inspectVolume = inspectVolume;
async function inspectVolumes(params, names) {
    return inspect(params, 'volume', names);
}
exports.inspectVolumes = inspectVolumes;
async function inspect(params, type, ids) {
    if (!ids.length) {
        return [];
    }
    const partial = toExecParameters(params);
    const result = await (0, commonUtils_1.runCommandNoPty)({
        ...partial,
        args: (partial.args || []).concat(['inspect', '--type', type, ...ids]),
    });
    try {
        return JSON.parse(result.stdout.toString());
    }
    catch (err) {
        console.error({
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
        });
        throw err;
    }
}
async function listContainers(params, all = false, labels = []) {
    const filterArgs = [];
    if (all) {
        filterArgs.push('-a');
    }
    for (const label of labels) {
        filterArgs.push('--filter', `label=${label}`);
    }
    const result = await dockerCLI(params, 'ps', '-q', ...filterArgs);
    return result.stdout
        .toString()
        .split(/\r?\n/)
        .filter(s => !!s);
}
exports.listContainers = listContainers;
async function listVolumes(params, labels = []) {
    const filterArgs = [];
    for (const label of labels) {
        filterArgs.push('--filter', `label=${label}`);
    }
    const result = await dockerCLI(params, 'volume', 'ls', '-q', ...filterArgs);
    return result.stdout
        .toString()
        .split(/\r?\n/)
        .filter(s => !!s);
}
exports.listVolumes = listVolumes;
async function createVolume(params, name, labels) {
    const labelArgs = [];
    for (const label of labels) {
        labelArgs.push('--label', label);
    }
    await dockerCLI(params, 'volume', 'create', ...labelArgs, name);
}
exports.createVolume = createVolume;
async function getEvents(params, filters) {
    const { exec, cmd, args, env, output } = toExecParameters(params);
    const filterArgs = [];
    for (const filter in filters) {
        for (const value of filters[filter]) {
            filterArgs.push('--filter', `${filter}=${value}`);
        }
    }
    const format = await isPodman(params) ? 'json' : '{{json .}}'; // https://github.com/containers/libpod/issues/5981
    const combinedArgs = (args || []).concat(['events', '--format', format, ...filterArgs]);
    const p = await exec({
        cmd,
        args: combinedArgs,
        env,
        output,
    });
    const stderr = [];
    p.stderr.on('data', data => stderr.push(data));
    p.exit.then(({ code, signal }) => {
        if (stderr.length) {
            output.write((0, errors_1.toErrorText)(Buffer.concat(stderr).toString()));
        }
        if (code || (signal && signal !== 'SIGKILL')) {
            output.write((0, errors_1.toErrorText)(`Docker events terminated (code: ${code}, signal: ${signal}).`));
        }
    }, err => {
        output.write((0, errors_1.toErrorText)(err && (err.stack || err.message)));
    });
    return p;
}
exports.getEvents = getEvents;
async function dockerBuildKitVersion(params) {
    try {
        const result = await dockerCLI(params, 'buildx', 'version');
        const versionMatch = result.stdout.toString().match(/(?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)/);
        if (!versionMatch) {
            return null;
        }
        return versionMatch[0];
    }
    catch {
        return null;
    }
}
exports.dockerBuildKitVersion = dockerBuildKitVersion;
async function dockerCLI(params, ...args) {
    const partial = toExecParameters(params);
    return (0, commonUtils_1.runCommandNoPty)({
        ...partial,
        args: (partial.args || []).concat(args),
    });
}
exports.dockerCLI = dockerCLI;
async function dockerContext(params) {
    var _a;
    try {
        // 'docker context show' is only available as an addon from the 'compose-cli'. 'docker context inspect' connects to the daemon making it slow. Using 'docker context ls' instead.
        const { stdout } = await dockerCLI(params, 'context', 'ls', '--format', '{{json .}}');
        const json = `[${stdout.toString()
            .trim()
            .split(/\r?\n/)
            .join(',')}]`;
        const contexts = JSON.parse(json);
        const current = (_a = contexts.find(c => c.Current)) === null || _a === void 0 ? void 0 : _a.Name;
        return current;
    }
    catch {
        // Docker is not installed or Podman does not have contexts.
        return undefined;
    }
}
exports.dockerContext = dockerContext;
async function isPodman(params) {
    const cliHost = 'cliHost' in params ? params.cliHost : params.common.cliHost;
    if (cliHost.platform !== 'linux') {
        return false;
    }
    try {
        const { stdout } = await dockerCLI(params, '-v');
        return stdout.toString().toLowerCase().indexOf('podman') !== -1;
    }
    catch (err) {
        return false;
    }
}
exports.isPodman = isPodman;
async function dockerPtyCLI(params, ...args) {
    const partial = toPtyExecParameters(params);
    return (0, commonUtils_1.runCommand)({
        ...partial,
        args: (partial.args || []).concat(args),
    });
}
exports.dockerPtyCLI = dockerPtyCLI;
async function dockerComposeCLI(params, ...args) {
    const partial = toExecParameters(params, 'dockerComposeCLI' in params ? await params.dockerComposeCLI() : undefined);
    return (0, commonUtils_1.runCommandNoPty)({
        ...partial,
        args: (partial.args || []).concat(args),
    });
}
exports.dockerComposeCLI = dockerComposeCLI;
async function dockerComposePtyCLI(params, ...args) {
    const partial = toPtyExecParameters(params, 'dockerComposeCLI' in params ? await params.dockerComposeCLI() : undefined);
    return (0, commonUtils_1.runCommand)({
        ...partial,
        args: (partial.args || []).concat(args),
    });
}
exports.dockerComposePtyCLI = dockerComposePtyCLI;
function dockerExecFunction(params, containerName, user) {
    return async function (execParams) {
        const { exec, cmd, args, env } = toExecParameters(params);
        const { argsPrefix, args: execArgs } = toDockerExecArgs(containerName, user, execParams, false);
        return exec({
            cmd,
            args: (args || []).concat(execArgs),
            env,
            output: replacingDockerExecLog(execParams.output, cmd, argsPrefix),
        });
    };
}
exports.dockerExecFunction = dockerExecFunction;
async function dockerPtyExecFunction(params, containerName, user, loadNativeModule) {
    const pty = await loadNativeModule('node-pty');
    if (!pty) {
        throw new Error('Missing node-pty');
    }
    return async function (execParams) {
        const { ptyExec, cmd, args, env } = toPtyExecParameters(params);
        const { argsPrefix, args: execArgs } = toDockerExecArgs(containerName, user, execParams, true);
        return ptyExec({
            cmd,
            args: (args || []).concat(execArgs),
            env,
            output: replacingDockerExecLog(execParams.output, cmd, argsPrefix),
        });
    };
}
exports.dockerPtyExecFunction = dockerPtyExecFunction;
function replacingDockerExecLog(original, cmd, args) {
    return replacingLog(original, `Run: ${cmd} ${(args || []).join(' ').replace(/\n.*/g, '')}`, 'Run in container:');
}
function replacingLog(original, search, replace) {
    const searchR = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const wrapped = (0, log_1.makeLog)({
        ...original,
        get dimensions() {
            return original.dimensions;
        },
        event: e => original.event('text' in e ? {
            ...e,
            text: e.text.replace(searchR, replace),
        } : e),
    });
    return wrapped;
}
function toDockerExecArgs(containerName, user, params, pty) {
    const { env, cwd, cmd, args } = params;
    const execArgs = ['exec', '-i'];
    if (pty) {
        execArgs.push('-t');
    }
    if (user) {
        execArgs.push('-u', user);
    }
    if (env) {
        Object.keys(env)
            .forEach(key => execArgs.push('-e', `${key}=${env[key]}`));
    }
    if (cwd) {
        execArgs.push('-w', cwd);
    }
    execArgs.push(containerName);
    const argsPrefix = execArgs.slice();
    execArgs.push(cmd);
    if (args) {
        execArgs.push(...args);
    }
    return { argsPrefix, args: execArgs };
}
function toExecParameters(params, compose) {
    return 'dockerEnv' in params ? {
        exec: params.common.cliHost.exec,
        cmd: compose ? compose.cmd : params.dockerCLI,
        args: compose ? compose.args : [],
        env: params.dockerEnv,
        output: params.common.output,
    } : 'cliHost' in params ? {
        exec: params.cliHost.exec,
        cmd: compose ? compose.cmd : params.dockerCLI,
        args: compose ? compose.args : [],
        env: params.env,
        output: params.output,
    } : {
        ...params,
        env: params.env,
    };
}
exports.toExecParameters = toExecParameters;
function toPtyExecParameters(params, compose) {
    return 'dockerEnv' in params ? {
        ptyExec: params.common.cliHost.ptyExec,
        cmd: compose ? compose.cmd : params.dockerCLI,
        args: compose ? compose.args : [],
        env: params.dockerEnv,
        output: params.common.output,
    } : 'cliHost' in params ? {
        ptyExec: params.cliHost.ptyExec,
        cmd: compose ? compose.cmd : params.dockerCLI,
        args: compose ? compose.args : [],
        env: params.env,
        output: params.output,
    } : {
        ...params,
        env: params.env,
    };
}
exports.toPtyExecParameters = toPtyExecParameters;
function toDockerImageName(name) {
    // https://docs.docker.com/engine/reference/commandline/tag/#extended-description
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\._-]+/g, '')
        .replace(/(\.[\._-]|_[\.-]|__[\._-]|-+[\._])[\._-]*/g, (_, a) => a.substr(0, a.length - 1));
}
exports.toDockerImageName = toDockerImageName;
