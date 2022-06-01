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
exports.isFile = exports.platformDispatch = exports.loadNativeModule = exports.fork = exports.isEarlierVersion = exports.parseVersion = exports.plainPtyExec = exports.plainExec = exports.runCommand = exports.runCommandNoPty = exports.isTsnode = exports.tsnode = exports.equalPaths = exports.getCLIHost = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cp = __importStar(require("child_process"));
const string_decoder_1 = require("string_decoder");
const errors_1 = require("./errors");
const pfs_1 = require("../spec-utils/pfs");
var cliHost_1 = require("./cliHost");
Object.defineProperty(exports, "getCLIHost", { enumerable: true, get: function () { return cliHost_1.getCLIHost; } });
function equalPaths(platform, a, b) {
    if (platform === 'linux') {
        return a === b;
    }
    return a.toLowerCase() === b.toLowerCase();
}
exports.equalPaths = equalPaths;
exports.tsnode = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'ts-node');
exports.isTsnode = path.basename(process.argv[0]) === 'ts-node' || process.argv.indexOf('ts-node/register') !== -1;
async function runCommandNoPty(options) {
    const { exec, cmd, args, cwd, env, stdin, output, print } = options;
    const p = await exec({
        cmd,
        args,
        cwd,
        env,
        output,
    });
    return new Promise((resolve, reject) => {
        const stdout = [];
        const stderr = [];
        const stdoutDecoder = print === 'continuous' ? new string_decoder_1.StringDecoder() : undefined;
        p.stdout.on('data', (chunk) => {
            stdout.push(chunk);
            if (print === 'continuous') {
                output.write(stdoutDecoder.write(chunk));
            }
        });
        p.stdout.on('error', (err) => {
            // ENOTCONN seen with missing executable in addition to ENOENT on child_process.
            if ((err === null || err === void 0 ? void 0 : err.code) !== 'ENOTCONN') {
                throw err;
            }
        });
        const stderrDecoder = print === 'continuous' ? new string_decoder_1.StringDecoder() : undefined;
        p.stderr.on('data', (chunk) => {
            stderr.push(chunk);
            if (print === 'continuous') {
                output.write((0, errors_1.toErrorText)(stderrDecoder.write(chunk)));
            }
        });
        p.stderr.on('error', (err) => {
            // ENOTCONN seen with missing executable in addition to ENOENT on child_process.
            if ((err === null || err === void 0 ? void 0 : err.code) !== 'ENOTCONN') {
                throw err;
            }
        });
        const subs = [];
        p.exit.then(({ code }) => {
            try {
                subs.forEach(sub => sub.dispose());
                const stdoutBuf = Buffer.concat(stdout);
                const stderrBuf = Buffer.concat(stderr);
                if (print === true || (code && print === 'onerror')) {
                    output.write(stdoutBuf.toString().replace(/\r?\n/g, '\r\n'));
                    output.write((0, errors_1.toErrorText)(stderrBuf.toString()));
                }
                if (print && code) {
                    output.write(`Exit code ${code}`);
                }
                if (code) {
                    reject({
                        message: `Command failed: ${cmd} ${(args || []).join(' ')}`,
                        stdout: stdoutBuf,
                        stderr: stderrBuf,
                        code
                    });
                }
                else {
                    resolve({
                        stdout: stdoutBuf,
                        stderr: stderrBuf,
                    });
                }
            }
            catch (e) {
                reject(e);
            }
        }, reject);
        if (stdin instanceof Buffer) {
            p.stdin.write(stdin, err => {
                if (err) {
                    reject(err);
                }
            });
            p.stdin.end();
        }
        else if (stdin instanceof fs.ReadStream) {
            stdin.pipe(p.stdin);
        }
        else if (typeof stdin === 'function') {
            subs.push(stdin(buf => p.stdin.write(buf)));
        }
    });
}
exports.runCommandNoPty = runCommandNoPty;
async function runCommand(options) {
    const { ptyExec, cmd, args, cwd, env, output, resolveOn, onDidInput } = options;
    const p = await ptyExec({
        cmd,
        args,
        cwd,
        env,
        output: output,
    });
    return new Promise((resolve, reject) => {
        let cmdOutput = '';
        const subs = [
            onDidInput && onDidInput(data => p.write(data)),
        ];
        p.onData(chunk => {
            cmdOutput += chunk;
            output.raw(chunk);
            if (resolveOn && resolveOn.exec(cmdOutput)) {
                resolve({ cmdOutput });
            }
        });
        p.exit.then(({ code, signal }) => {
            try {
                subs.forEach(sub => sub === null || sub === void 0 ? void 0 : sub.dispose());
                if (code || signal) {
                    reject({
                        message: `Command failed: ${cmd} ${(args || []).join(' ')}`,
                        cmdOutput: cmdOutput,
                        code,
                        signal,
                    });
                }
                else {
                    resolve({ cmdOutput });
                }
            }
            catch (e) {
                reject(e);
            }
        }, e => {
            subs.forEach(sub => sub === null || sub === void 0 ? void 0 : sub.dispose());
            reject(e);
        });
    });
}
exports.runCommand = runCommand;
function plainExec(defaultCwd) {
    return async function (params) {
        const { cmd, args, output } = params;
        const text = `Run: ${cmd} ${(args || []).join(' ').replace(/\n.*/g, '')}`;
        const start = output.start(text);
        const cwd = params.cwd || defaultCwd;
        const env = params.env ? { ...process.env, ...params.env } : process.env;
        const exec = await findLocalWindowsExecutable(cmd, cwd, env, output);
        const p = cp.spawn(exec, args, { cwd, env, windowsHide: true });
        return {
            stdin: p.stdin,
            stdout: p.stdout,
            stderr: p.stderr,
            exit: new Promise((resolve, reject) => {
                p.once('error', err => {
                    output.stop(text, start);
                    reject(err);
                });
                p.once('close', (code, signal) => {
                    output.stop(text, start);
                    resolve({ code, signal });
                });
            }),
            async terminate() {
                p.kill('SIGKILL');
            }
        };
    };
}
exports.plainExec = plainExec;
async function plainPtyExec(defaultCwd, loadNativeModule) {
    const pty = await loadNativeModule('node-pty');
    if (!pty) {
        throw new Error('Missing node-pty');
    }
    return async function (params) {
        var _a, _b;
        const { cmd, args, output } = params;
        const text = `Run: ${cmd} ${(args || []).join(' ').replace(/\n.*/g, '')}`;
        const start = output.start(text);
        const useConpty = false; // TODO: Investigate using a shell with ConPTY. https://github.com/Microsoft/vscode-remote/issues/1234#issuecomment-485501275
        const cwd = params.cwd || defaultCwd;
        const env = params.env ? { ...process.env, ...params.env } : process.env;
        const exec = await findLocalWindowsExecutable(cmd, cwd, env, output);
        const p = pty.spawn(exec, args || [], {
            cwd,
            env: env,
            cols: (_a = output.dimensions) === null || _a === void 0 ? void 0 : _a.columns,
            rows: (_b = output.dimensions) === null || _b === void 0 ? void 0 : _b.rows,
            useConpty,
        });
        const subs = [
            output.onDidChangeDimensions && output.onDidChangeDimensions(e => p.resize(e.columns, e.rows))
        ];
        return {
            onData: p.onData.bind(p),
            write: p.write.bind(p),
            resize: p.resize.bind(p),
            exit: new Promise(resolve => {
                p.onExit(({ exitCode, signal }) => {
                    subs.forEach(sub => sub === null || sub === void 0 ? void 0 : sub.dispose());
                    output.stop(text, start);
                    resolve({ code: exitCode, signal });
                    if (process.platform === 'win32') {
                        try {
                            // In some cases the process hasn't cleanly exited on Windows and the winpty-agent gets left around
                            // https://github.com/microsoft/node-pty/issues/333
                            p.kill();
                        }
                        catch {
                        }
                    }
                });
            }),
            async terminate() {
                p.kill('SIGKILL');
            }
        };
    };
}
exports.plainPtyExec = plainPtyExec;
async function findLocalWindowsExecutable(command, cwd = process.cwd(), env, output) {
    if (process.platform !== 'win32') {
        return command;
    }
    // From terminalTaskSystem.ts.
    // If we have an absolute path then we take it.
    if (path.isAbsolute(command)) {
        return await findLocalWindowsExecutableWithExtension(command) || command;
    }
    if (/[/\\]/.test(command)) {
        // We have a directory and the directory is relative (see above). Make the path absolute
        // to the current working directory.
        const fullPath = path.join(cwd, command);
        return await findLocalWindowsExecutableWithExtension(fullPath) || fullPath;
    }
    let pathValue = undefined;
    let paths = undefined;
    // The options can override the PATH. So consider that PATH if present.
    if (env) {
        // Path can be named in many different ways and for the execution it doesn't matter
        for (let key of Object.keys(env)) {
            if (key.toLowerCase() === 'path') {
                const value = env[key];
                if (typeof value === 'string') {
                    pathValue = value;
                    paths = value.split(path.delimiter)
                        .filter(Boolean);
                    paths.push(path.join(env.ProgramW6432 || 'C:\\Program Files', 'Docker\\Docker\\resources\\bin')); // Fall back when newly installed.
                }
                break;
            }
        }
    }
    // No PATH environment. Make path absolute to the cwd.
    if (paths === void 0 || paths.length === 0) {
        output.write(`findLocalWindowsExecutable: No PATH to look up exectuable '${command}'.`);
        const fullPath = path.join(cwd, command);
        return await findLocalWindowsExecutableWithExtension(fullPath) || fullPath;
    }
    // We have a simple file name. We get the path variable from the env
    // and try to find the executable on the path.
    for (let pathEntry of paths) {
        // The path entry is absolute.
        let fullPath;
        if (path.isAbsolute(pathEntry)) {
            fullPath = path.join(pathEntry, command);
        }
        else {
            fullPath = path.join(cwd, pathEntry, command);
        }
        const withExtension = await findLocalWindowsExecutableWithExtension(fullPath);
        if (withExtension) {
            return withExtension;
        }
    }
    output.write(`findLocalWindowsExecutable: Exectuable '${command}' not found on PATH '${pathValue}'.`);
    const fullPath = path.join(cwd, command);
    return await findLocalWindowsExecutableWithExtension(fullPath) || fullPath;
}
const pathext = process.env.PATHEXT;
const executableExtensions = pathext ? pathext.toLowerCase().split(';') : ['.com', '.exe', '.bat', '.cmd'];
async function findLocalWindowsExecutableWithExtension(fullPath) {
    if (executableExtensions.indexOf(path.extname(fullPath)) !== -1) {
        return await (0, pfs_1.isLocalFile)(fullPath) ? fullPath : undefined;
    }
    for (const ext of executableExtensions) {
        const withExtension = fullPath + ext;
        if (await (0, pfs_1.isLocalFile)(withExtension)) {
            return withExtension;
        }
    }
    return undefined;
}
function parseVersion(str) {
    const m = /^'?v?(\d+(\.\d+)*)/.exec(str);
    if (!m) {
        return undefined;
    }
    return m[1].split('.')
        .map(i => parseInt(i, 10));
}
exports.parseVersion = parseVersion;
function isEarlierVersion(left, right) {
    for (let i = 0, n = Math.max(left.length, right.length); i < n; i++) {
        const l = left[i] || 0;
        const r = right[i] || 0;
        if (l !== r) {
            return l < r;
        }
    }
    return false; // Equal.
}
exports.isEarlierVersion = isEarlierVersion;
exports.fork = exports.isTsnode ? (mod, args, options) => {
    return cp.spawn(exports.tsnode, [mod, ...(args || [])], { ...options, windowsHide: true });
} : cp.fork;
async function loadNativeModule(moduleName) {
    // Check NODE_PATH for Electron. Do this first to avoid loading a binary-incompatible version from the local node_modules during development.
    if (process.env.NODE_PATH) {
        for (const nodePath of process.env.NODE_PATH.split(path.delimiter)) {
            if (nodePath) {
                try {
                    return require(`${nodePath}/${moduleName}`);
                }
                catch (err) {
                    // Not available.
                }
            }
        }
    }
    try {
        return require(moduleName);
    }
    catch (err) {
        // Not available.
    }
    return undefined;
}
exports.loadNativeModule = loadNativeModule;
function platformDispatch(platform, platformSwitch) {
    if (typeof platformSwitch !== 'string' && 'win32' in platformSwitch) {
        return platform === 'win32' ? platformSwitch.win32 : platformSwitch.posix;
    }
    return platformSwitch;
}
exports.platformDispatch = platformDispatch;
async function isFile(shellServer, location) {
    return platformDispatch(shellServer.platform, {
        posix: async () => {
            try {
                await shellServer.exec(`test -f '${location}'`);
                return true;
            }
            catch (err) {
                return false;
            }
        },
        win32: async () => {
            return (await shellServer.exec(`Test-Path '${location}' -PathType Leaf`))
                .stdout.trim() === 'True';
        }
    })();
}
exports.isFile = isFile;
