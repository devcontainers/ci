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
const os = __importStar(require("os"));
const config = __importStar(require("./config"));
const file_1 = require("./file");
const envvars_1 = require("./envvars");
const users_1 = require("./users");
function isDockerBuildXInstalled(exec) {
    return __awaiter(this, void 0, void 0, function* () {
        const { exitCode } = yield exec('docker', ['buildx', '--help'], { silent: true });
        return exitCode === 0;
    });
}
exports.isDockerBuildXInstalled = isDockerBuildXInstalled;
function buildImage(exec, imageName, imageTag, checkoutPath, subFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const folder = path_1.default.join(checkoutPath, subFolder);
        const devcontainerJsonPath = path_1.default.join(folder, '.devcontainer/devcontainer.json');
        const devcontainerConfig = yield config.loadFromFile(devcontainerJsonPath);
        // build the image from the .devcontainer spec
        yield buildImageBase(exec, imageName, imageTag, folder, devcontainerConfig);
        if (!devcontainerConfig.remoteUser) {
            return imageName;
        }
        return yield ensureHostAndContainerUsersAlign(exec, imageName, imageTag, devcontainerConfig);
    });
}
exports.buildImage = buildImage;
function buildImageBase(exec, imageName, imageTag, folder, devcontainerConfig) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const configDockerfile = config.getDockerfile(devcontainerConfig);
        if (!configDockerfile) {
            throw new Error('dockerfile not set in devcontainer.json - devcontainer-build-run currently only supports Dockerfile-based dev containers');
        }
        const dockerfilePath = path_1.default.join(folder, '.devcontainer', configDockerfile);
        const configContext = (_a = config.getContext(devcontainerConfig)) !== null && _a !== void 0 ? _a : '';
        const contextPath = path_1.default.join(folder, '.devcontainer', configContext);
        const args = ['buildx', 'build'];
        args.push('--tag');
        args.push(`${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`);
        args.push('--cache-from');
        args.push(`type=registry,ref=${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`);
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
        const { exitCode } = yield exec('docker', args, {});
        if (exitCode !== 0) {
            throw new Error(`build failed with ${exitCode}`);
        }
    });
}
// returns the name of the image to run in the next step
function ensureHostAndContainerUsersAlign(exec, imageName, imageTag, devcontainerConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!devcontainerConfig.remoteUser) {
            return imageName;
        }
        const resultHostUser = yield exec('/bin/sh', ['-c', 'id -u -n'], { silent: true });
        if (resultHostUser.exitCode !== 0) {
            throw new Error(`Failed to get host user (exitcode: ${resultHostUser.exitCode}):${resultHostUser.stdout}\n${resultHostUser.stderr}`);
        }
        const resultHostPasswd = yield exec('/bin/sh', ['-c', "cat /etc/passwd"], { silent: true });
        if (resultHostPasswd.exitCode !== 0) {
            throw new Error(`Failed to get host user info (exitcode: ${resultHostPasswd.exitCode}):${resultHostPasswd.stdout}\n${resultHostPasswd.stderr}`);
        }
        const resultContainerPasswd = yield exec('docker', ['run', '--rm', `${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`, 'sh', '-c', "cat /etc/passwd"], { silent: true });
        if (resultContainerPasswd.exitCode !== 0) {
            throw new Error(`Failed to get container user info (exitcode: ${resultContainerPasswd.exitCode}):${resultContainerPasswd.stdout}\n${resultContainerPasswd.stderr}`);
        }
        const resultContainerGroup = yield exec('docker', ['run', '--rm', `${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`, 'sh', '-c', "cat /etc/group"], { silent: true });
        if (resultContainerGroup.exitCode !== 0) {
            throw new Error(`Failed to get container group info (exitcode: ${resultContainerGroup.exitCode}):${resultContainerGroup.stdout}\n${resultContainerGroup.stderr}`);
        }
        const hostUserName = resultHostUser.stdout.trim();
        const hostUsers = users_1.parsePasswd(resultHostPasswd.stdout);
        const hostUser = hostUsers.find(u => u.name === hostUserName);
        if (!hostUser) {
            console.log(`Host /etc/passwd:\n${resultHostPasswd.stdout}`);
            throw new Error(`Failed to find host user in host info. (hostUserName='${hostUserName}')`);
        }
        const containerUserName = devcontainerConfig.remoteUser;
        const containerUsers = users_1.parsePasswd(resultContainerPasswd.stdout);
        const containerGroups = users_1.parseGroup(resultContainerGroup.stdout);
        const containerUser = containerUsers.find(u => u.name === containerUserName);
        if (!containerUser) {
            console.log(`Container /etc/passwd:\n${resultContainerPasswd.stdout}`);
            throw new Error(`Failed to find container user in container info. (containerUserName='${containerUserName}')`);
        }
        const existingContainerUserGroup = containerGroups.find(g => g.gid == hostUser.gid);
        if (existingContainerUserGroup)
            throw new Error(`Host user GID (${hostUser.gid}) already exists as a group in the container`);
        const containerUserAligned = hostUser.uid === containerUser.uid && hostUser.gid == containerUser.gid;
        if (containerUserAligned) {
            // all good - nothing to do
            return imageName;
        }
        // Generate a Dockerfile to run to build a derived image with the UID/GID updated
        const dockerfileContent = `FROM ${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}
RUN sudo chown -R ${hostUser.uid}:${hostUser.gid} /home/${containerUserName} \
    && sudo sed -i /etc/passwd -e s/${containerUser.name}:x:${containerUser.uid}:${containerUser.gid}/${containerUser.name}:x:${hostUser.uid}:${hostUser.gid}/
`;
        const tempDir = fs.mkdtempSync(path_1.default.join(os.tmpdir(), "tmp-devcontainer-build-run"));
        const derivedDockerfilePath = path_1.default.join(tempDir, "Dockerfile");
        fs.writeFileSync(derivedDockerfilePath, dockerfileContent);
        const derivedImageName = `${imageName}-userfix`;
        // TODO - `buildx build` was giving issues when building an image for the first time and it is unable to 
        // pull the image from the registry
        // const derivedDockerBuild = await exec('docker', ['buildx', 'build', '--tag', derivedImageName, '-f', derivedDockerfilePath, tempDir, '--output=type=docker'], {})
        const derivedDockerBuild = yield exec('docker', ['build', '--tag', `${derivedImageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`, '-f', derivedDockerfilePath, tempDir, '--output=type=docker'], {});
        if (derivedDockerBuild.exitCode !== 0) {
            throw new Error("Failed to build derived Docker image with users updated");
        }
        return derivedImageName;
    });
}
function runContainer(exec, imageName, imageTag, checkoutPath, subFolder, command, envs, mounts) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkoutPathAbsolute = file_1.getAbsolutePath(checkoutPath, process.cwd());
        const folder = path_1.default.join(checkoutPathAbsolute, subFolder);
        const devcontainerJsonPath = path_1.default.join(folder, '.devcontainer/devcontainer.json');
        const devcontainerConfig = yield config.loadFromFile(devcontainerJsonPath);
        const workspaceFolder = config.getWorkspaceFolder(devcontainerConfig, checkoutPathAbsolute);
        const workdir = path_1.default.join(workspaceFolder, subFolder);
        const remoteUser = config.getRemoteUser(devcontainerConfig);
        const args = ['run', '--rm'];
        args.push('--label', `github.com/stuartleeks/devcontainer-build-run/`);
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
        args.push('--workdir', workdir);
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
        args.push(`${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`);
        args.push('bash', '-c', command);
        const { exitCode } = yield exec('docker', args, {});
        if (exitCode !== 0) {
            throw new Error(`run failed with ${exitCode}`);
        }
    });
}
exports.runContainer = runContainer;
function pushImage(exec, imageName, imageTag) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = ['push'];
        args.push(`${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`);
        const { exitCode } = yield exec('docker', args, {});
        if (exitCode !== 0) {
            throw new Error(`push failed with ${exitCode}`);
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
