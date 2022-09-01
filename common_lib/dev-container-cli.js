"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devcontainer = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const cliVersion = "latest"; // Use 'latest' to get latest CLI version, or pin to specific version e.g. '0.14.1' if required
function getSpecCliInfo() {
    // // TODO - this is temporary until the CLI is installed via npm
    // // TODO - ^ could consider an `npm install` from the folder
    // const specCLIPath = path.resolve(__dirname, "..", "cli", "cli.js");
    // return {
    //   command: `node ${specCLIPath}`,
    // };
    return {
        command: 'devcontainer',
    };
}
function isCliInstalled(exec) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { exitCode } = yield exec(getSpecCliInfo().command, ['--help'], {
                silent: true,
            });
            return exitCode === 0;
        }
        catch (error) {
            return false;
        }
    });
}
const fstat = util_1.promisify(fs_1.default.stat);
function installCli(exec) {
    return __awaiter(this, void 0, void 0, function* () {
        // if we have a local 'cli' folder, then use that as we're testing a private cli build
        let cliStat = null;
        try {
            cliStat = yield fstat('./cli');
        }
        catch (_a) {
        }
        if (cliStat && cliStat.isDirectory()) {
            console.log('** Installing local cli');
            const { exitCode, stdout, stderr } = yield exec('bash', ['-c', 'cd cli && npm install && npm install -g'], {});
            if (exitCode != 0) {
                console.log(stdout);
                console.error(stderr);
            }
            return exitCode === 0;
        }
        console.log('** Installing @devcontainers/cli');
        const { exitCode, stdout, stderr } = yield exec('bash', ['-c', `npm install -g @devcontainers/cli@${cliVersion}`], {});
        if (exitCode != 0) {
            console.log(stdout);
            console.error(stderr);
        }
        return exitCode === 0;
    });
}
function spawn(command, args, options) {
    return new Promise((resolve, reject) => {
        const proc = child_process_1.spawn(command, args, { env: options.env });
        proc.stdout.on('data', data => options.log(data.toString()));
        proc.stderr.on('data', data => options.err(data.toString()));
        proc.on('error', err => {
            reject(err);
        });
        proc.on('close', code => {
            resolve({
                code: code,
            });
        });
    });
}
function parseCliOutput(value) {
    if (value === '') {
        // TODO - revisit this
        throw new Error('Unexpected empty output from CLI');
    }
    try {
        return JSON.parse(value);
    }
    catch (error) {
        return {
            code: -1,
            outcome: 'error',
            message: 'Failed to parse CLI output',
            description: `Failed to parse CLI output as JSON: ${value}\nError: ${error}`,
        };
    }
}
function runSpecCli(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let stdout = '';
        const spawnOptions = {
            log: data => (stdout += data),
            err: data => options.log(data),
            env: options.env ? Object.assign(Object.assign({}, process.env), options.env) : process.env,
        };
        const command = getSpecCliInfo().command;
        console.log(`About to run ${command} ${options.args.join(' ')}`); // TODO - take an output arg to allow GH to use core.info
        yield spawn(command, options.args, spawnOptions);
        return parseCliOutput(stdout);
    });
}
function devContainerBuild(args, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const commandArgs = [
            'build',
            '--workspace-folder',
            args.workspaceFolder,
        ];
        if (args.imageName) {
            commandArgs.push('--image-name', args.imageName);
        }
        if (args.userDataFolder) {
            commandArgs.push("--user-data-folder", args.userDataFolder);
        }
        if (args.additionalCacheFroms) {
            args.additionalCacheFroms.forEach(cacheFrom => commandArgs.push('--cache-from', cacheFrom));
        }
        return yield runSpecCli({
            args: commandArgs,
            log,
            env: { DOCKER_BUILDKIT: '1', COMPOSE_DOCKER_CLI_BUILD: '1' },
        });
    });
}
function devContainerUp(args, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const commandArgs = [
            'up',
            '--workspace-folder',
            args.workspaceFolder,
        ];
        if (args.additionalCacheFroms) {
            args.additionalCacheFroms.forEach(cacheFrom => commandArgs.push('--cache-from', cacheFrom));
        }
        if (args.userDataFolder) {
            commandArgs.push("--user-data-folder", args.userDataFolder);
        }
        if (args.skipContainerUserIdUpdate) {
            commandArgs.push('--update-remote-user-uid-default', 'off');
        }
        return yield runSpecCli({
            args: commandArgs,
            log,
            env: { DOCKER_BUILDKIT: '1', COMPOSE_DOCKER_CLI_BUILD: '1' },
        });
    });
}
function devContainerExec(args, log) {
    return __awaiter(this, void 0, void 0, function* () {
        // const remoteEnvArgs = args.env ? args.env.flatMap(e=> ["--remote-env", e]): []; // TODO - test flatMap again
        const remoteEnvArgs = getRemoteEnvArray(args.env);
        const commandArgs = ["exec", "--workspace-folder", args.workspaceFolder, ...remoteEnvArgs, ...args.command];
        if (args.userDataFolder) {
            commandArgs.push("--user-data-folder", args.userDataFolder);
        }
        return yield runSpecCli({
            args: commandArgs,
            log,
            env: { DOCKER_BUILDKIT: '1', COMPOSE_DOCKER_CLI_BUILD: '1' },
        });
    });
}
function getRemoteEnvArray(env) {
    if (!env) {
        return [];
    }
    let result = [];
    for (let i = 0; i < env.length; i++) {
        const envItem = env[i];
        result.push('--remote-env', envItem);
    }
    return result;
}
exports.devcontainer = {
    build: devContainerBuild,
    up: devContainerUp,
    exec: devContainerExec,
    isCliInstalled,
    installCli,
};
