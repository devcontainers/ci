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
exports.launch = exports.EOT = void 0;
const path = __importStar(require("path"));
const string_decoder_1 = require("string_decoder");
const commonUtils_1 = require("./commonUtils");
exports.EOT = '\u2404';
async function launch(remoteExec, output, agentSessionId, platform = 'linux', hostName = 'Container') {
    const isExecFunction = typeof remoteExec === 'function';
    const isWindows = platform === 'win32';
    const p = isExecFunction ? await remoteExec({
        env: agentSessionId ? { VSCODE_REMOTE_CONTAINERS_SESSION: agentSessionId } : {},
        cmd: isWindows ? 'powershell' : '/bin/sh',
        args: isWindows ? ['-NoProfile', '-Command', '-'] : [],
        output,
    }) : remoteExec;
    if (!isExecFunction) {
        // TODO: Pass in agentSessionId.
        const stdinText = isWindows
            ? `powershell -NoProfile -Command "powershell -NoProfile -Command -"\n` // Nested PowerShell (for some reason) avoids the echo of stdin on stdout.
            : `/bin/sh -c 'echo ${exports.EOT}; /bin/sh'\n`;
        p.stdin.write(stdinText);
        const eot = new Promise(resolve => {
            let stdout = '';
            const stdoutDecoder = new string_decoder_1.StringDecoder();
            p.stdout.on('data', function eotListener(chunk) {
                stdout += stdoutDecoder.write(chunk);
                if (stdout.includes(stdinText)) {
                    p.stdout.off('data', eotListener);
                    resolve();
                }
            });
        });
        await eot;
    }
    const monitor = monitorProcess(p);
    let lastExec;
    async function exec(cmd, options) {
        const currentExec = lastExec = (async () => {
            try {
                await lastExec;
            }
            catch (err) {
                // ignore
            }
            return _exec((0, commonUtils_1.platformDispatch)(platform, cmd), options);
        })();
        try {
            return await Promise.race([currentExec, monitor.unexpectedExit]);
        }
        finally {
            monitor.disposeStdioListeners();
            if (lastExec === currentExec) {
                lastExec = undefined;
            }
        }
    }
    async function _exec(cmd, options) {
        const text = `Run in ${hostName.toLowerCase()}: ${cmd.replace(/\n.*/g, '')}`;
        let start;
        if ((options === null || options === void 0 ? void 0 : options.logOutput) !== 'silent') {
            start = output.start(text, options === null || options === void 0 ? void 0 : options.logLevel);
        }
        if (p.stdin.destroyed) {
            output.write('Stdin closed!');
            const { code, signal } = await p.exit;
            return Promise.reject({ message: `Shell server terminated (code: ${code}, signal: ${signal})`, code, signal });
        }
        if (platform === 'win32') {
            p.stdin.write(`[Console]::Write('${exports.EOT}'); ( ${cmd} ); [Console]::Write("${exports.EOT}$LastExitCode ${exports.EOT}"); [Console]::Error.Write('${exports.EOT}')\n`);
        }
        else {
            p.stdin.write(`echo -n ${exports.EOT}; ( ${cmd} ); echo -n ${exports.EOT}$?${exports.EOT}; echo -n ${exports.EOT} >&2\n`);
        }
        const [stdoutP0, stdoutP] = read(p.stdout, [1, 2], (options === null || options === void 0 ? void 0 : options.logOutput) === 'continuous' ? (str, i, j) => {
            if (i === 1 && j === 0) {
                output.write(str, options === null || options === void 0 ? void 0 : options.logLevel);
            }
        } : () => undefined);
        const stderrP = read(p.stderr, [1], (options === null || options === void 0 ? void 0 : options.logOutput) === 'continuous' ? (str, i, j) => {
            if (i === 0 && j === 0) {
                output.write(str, options === null || options === void 0 ? void 0 : options.logLevel); // TODO
            }
        } : () => undefined)[0];
        if (options === null || options === void 0 ? void 0 : options.stdin) {
            await stdoutP0; // Wait so `cmd` has its stdin set up.
            p.stdin.write(options === null || options === void 0 ? void 0 : options.stdin);
        }
        const [stdout, codeStr] = await stdoutP;
        const [stderr] = await stderrP;
        const code = parseInt(codeStr, 10) || 0;
        if ((options === null || options === void 0 ? void 0 : options.logOutput) === undefined || (options === null || options === void 0 ? void 0 : options.logOutput) === true) {
            output.write(stdout, options === null || options === void 0 ? void 0 : options.logLevel);
            output.write(stderr, options === null || options === void 0 ? void 0 : options.logLevel); // TODO
            if (code) {
                output.write(`Exit code ${code}`, options === null || options === void 0 ? void 0 : options.logLevel);
            }
        }
        if ((options === null || options === void 0 ? void 0 : options.logOutput) === 'continuous' && code) {
            output.write(`Exit code ${code}`, options === null || options === void 0 ? void 0 : options.logLevel);
        }
        if ((options === null || options === void 0 ? void 0 : options.logOutput) !== 'silent') {
            output.stop(text, start, options === null || options === void 0 ? void 0 : options.logLevel);
        }
        if (code) {
            return Promise.reject({ message: `Command in ${hostName.toLowerCase()} failed: ${cmd}`, code, stdout, stderr });
        }
        return { stdout, stderr };
    }
    return { exec, process: p, platform, path: (0, commonUtils_1.platformDispatch)(platform, path) };
}
exports.launch = launch;
function read(stream, numberOfResults, log) {
    const promises = numberOfResults.map(() => {
        let cbs;
        const promise = new Promise((resolve, reject) => cbs = { resolve, reject });
        return { promise, ...cbs };
    });
    const decoder = new string_decoder_1.StringDecoder('utf8');
    const strings = [];
    let j = 0;
    let results = [];
    function data(chunk) {
        const str = decoder.write(chunk);
        consume(str);
    }
    function consume(str) {
        // console.log(`consume ${numberOfResults}: '${str}'`);
        const i = str.indexOf(exports.EOT);
        if (i !== -1) {
            const s = str.substr(0, i);
            strings.push(s);
            log(s, j, results.length);
            // console.log(`result ${numberOfResults}: '${strings.join('')}'`);
            results.push(strings.join(''));
            strings.length = 0;
            if (results.length === numberOfResults[j]) {
                promises[j].resolve(results);
                j++;
                results = [];
                if (j === numberOfResults.length) {
                    stream.off('data', data);
                }
            }
            if (i + 1 < str.length) {
                consume(str.substr(i + 1));
            }
        }
        else {
            strings.push(str);
            log(str, j, results.length);
        }
    }
    stream.on('data', data);
    return promises.map(p => p.promise);
}
function monitorProcess(p) {
    let processExited;
    const unexpectedExit = new Promise((_resolve, reject) => processExited = reject);
    const stdout = [];
    const stderr = [];
    const stdoutListener = (chunk) => stdout.push(chunk);
    const stderrListener = (chunk) => stderr.push(chunk);
    p.stdout.on('data', stdoutListener);
    p.stderr.on('data', stderrListener);
    p.exit.then(({ code, signal }) => {
        processExited(`Shell server terminated (code: ${code}, signal: ${signal})
${Buffer.concat(stdout).toString()}
${Buffer.concat(stderr).toString()}`);
    }, err => {
        processExited(`Shell server failed: ${err && (err.stack || err.message)}`);
    });
    const disposeStdioListeners = () => {
        p.stdout.off('data', stdoutListener);
        p.stderr.off('data', stderrListener);
        stdout.length = 0;
        stderr.length = 0;
    };
    return {
        unexpectedExit,
        disposeStdioListeners,
    };
}
