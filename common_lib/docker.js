"use strict";
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
exports.parseMount = exports.pushImage = exports.runContainer = exports.buildImage = exports.isDockerBuildXInstalled = void 0;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const config = __importStar(require("./config"));
const file_1 = require("./file");
const envvars_1 = require("./envvars");
function isDockerBuildXInstalled(exec) {
    return __awaiter(this, void 0, void 0, function* () {
        const exitCode = yield exec('docker', ['buildx', '--help']);
        return exitCode === 0;
    });
}
exports.isDockerBuildXInstalled = isDockerBuildXInstalled;
function buildImage(exec, imageName, checkoutPath, subFolder) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const folder = path_1.default.join(checkoutPath, subFolder);
        const devcontainerJsonPath = path_1.default.join(folder, '.devcontainer/devcontainer.json');
        const devcontainerConfig = yield config.loadFromFile(devcontainerJsonPath);
        const configDockerfile = config.getDockerfile(devcontainerConfig);
        if (!configDockerfile) {
            throw new Error('dockerfile not set in devcontainer.json - devcontainer-build-run currently only supports Dockerfile-based dev containers');
        }
        const dockerfilePath = path_1.default.join(folder, '.devcontainer', configDockerfile);
        const configContext = (_a = config.getContext(devcontainerConfig)) !== null && _a !== void 0 ? _a : '';
        const contextPath = path_1.default.join(folder, '.devcontainer', configContext);
        const args = ['buildx', 'build'];
        args.push('--tag');
        args.push(`${imageName}:latest`);
        args.push('--cache-from');
        args.push(`type=registry,ref=${imageName}:latest`);
        args.push('--cache-to');
        args.push('type=inline');
        args.push('--output=type=docker');
        const buildArgs = (_b = devcontainerConfig.build) === null || _b === void 0 ? void 0 : _b.args;
        for (const argName in buildArgs) {
            const argValue = envvars_1.substituteValues(buildArgs[argName]);
            args.push('--build-arg', `${argName}=${argValue}`);
        }
        args.push('-f', dockerfilePath);
        args.push(contextPath);
        // TODO - add abstraction to allow startGroup on GH actions
        // core.startGroup('🏗 Building dev container...')
        try {
            const exitCode = yield exec('docker', args);
            if (exitCode !== 0) {
                throw new Error(`build failed with ${exitCode}`);
            }
        }
        finally {
            // core.endGroup() // TODO
        }
    });
}
exports.buildImage = buildImage;
function runContainer(exec, imageName, checkoutPath, subFolder, command, envs, mounts) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkoutPathAbsolute = file_1.getAbsolutePath(checkoutPath, process.cwd());
        const folder = path_1.default.join(checkoutPathAbsolute, subFolder);
        const devcontainerJsonPath = path_1.default.join(folder, '.devcontainer/devcontainer.json');
        const devcontainerConfig = yield config.loadFromFile(devcontainerJsonPath);
        const workspaceFolder = config.getWorkspaceFolder(devcontainerConfig, folder);
        const remoteUser = config.getRemoteUser(devcontainerConfig);
        const args = ['run'];
        args.push('--mount', `type=bind,src=${checkoutPathAbsolute},dst=${workspaceFolder}`);
        if (devcontainerConfig.mounts) {
            devcontainerConfig.mounts
                .map(m => envvars_1.substituteValues(m))
                .forEach(m => {
                const mount = parseMount(m);
                if (mount.type === "bind") {
                    // check path exists
                    if (!fs.existsSync(mount.source)) {
                        console.log(`Skipping mount as source does not exist: '${m}'`);
                        return;
                    }
                }
                args.push('--mount', m);
            });
        }
        args.push('--workdir', workspaceFolder);
        args.push('--user', remoteUser);
        if (devcontainerConfig.runArgs) {
            const substitutedRunArgs = devcontainerConfig.runArgs.map(a => envvars_1.substituteValues(a));
            args.push(...substitutedRunArgs);
        }
        if (envs) {
            for (const env of envs) {
                args.push('--env', env);
            }
        }
        args.push(`${imageName}:latest`);
        args.push('bash', '-c', `sudo chown -R $(whoami) . && ${command}`); // TODO sort out permissions/user alignment
        // core.startGroup('🏃‍♀️ Running dev container...')
        try {
            const exitCode = yield exec('docker', args);
            if (exitCode !== 0) {
                throw new Error(`run failed with ${exitCode}`);
            }
        }
        finally {
            // core.endGroup()
        }
    });
}
exports.runContainer = runContainer;
function pushImage(exec, imageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = ['push'];
        args.push(`${imageName}:latest`);
        // core.startGroup('Pushing image...')
        try {
            const exitCode = yield exec('docker', args);
            if (exitCode !== 0) {
                throw new Error(`push failed with ${exitCode}`);
            }
        }
        finally {
            // core.endGroup()
        }
    });
}
exports.pushImage = pushImage;
function parseMount(mountString) {
    // https://docs.docker.com/engine/reference/commandline/service_create/#add-bind-mounts-volumes-or-memory-filesystems
    // examples:
    //		type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock
    //		src=home-cache,target=/home/vscode/.cache
    let type = '';
    let source = '';
    let target = '';
    const options = mountString.split(',');
    for (const option of options) {
        const parts = option.split('=');
        switch (parts[0]) {
            case 'type':
                type = parts[1];
                break;
            case 'src':
            case 'source':
                source = parts[1];
                break;
            case 'dst':
            case 'destination':
            case 'target':
                target = parts[1];
                break;
            case 'readonly':
            case 'ro':
                // ignore
                break;
            default:
                throw new Error(`Unhandled mount option '${parts[0]}'`);
        }
    }
    return { type, source, target };
}
exports.parseMount = parseMount;
