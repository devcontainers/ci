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
const core = __importStar(require("@actions/core"));
const path_1 = __importDefault(require("path"));
const exec_1 = require("./exec");
const dev_container_cli_1 = require("../../common/src/dev-container-cli");
const docker_1 = require("./docker");
const envvars_1 = require("../../common/src/envvars");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const hasRunMain = core.getState('hasRunMain');
        if (hasRunMain === 'true') {
            return yield runPost();
        }
        else {
            core.saveState('hasRunMain', 'true');
            return yield runMain();
        }
    });
}
function runMain() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.info('Starting...');
            const buildXInstalled = yield docker_1.isDockerBuildXInstalled();
            if (!buildXInstalled) {
                core.setFailed('docker buildx not available: add a step to set up with docker/setup-buildx-action');
                return;
            }
            const devContainerCliInstalled = yield dev_container_cli_1.devcontainer.isCliInstalled(exec_1.exec);
            if (!devContainerCliInstalled) {
                core.info('Installing dev-containers-cli...');
                const success = yield dev_container_cli_1.devcontainer.installCli(exec_1.exec);
                if (!success) {
                    core.setFailed('dev-containers-cli install failed!');
                    return;
                }
            }
            const checkoutPath = core.getInput('checkoutPath');
            const imageName = core.getInput('imageName', { required: true });
            const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
            const subFolder = core.getInput('subFolder');
            const runCommand = core.getInput('runCmd', { required: true });
            const inputEnvs = core.getMultilineInput('env');
            const inputEnvsWithDefaults = envvars_1.populateDefaults(inputEnvs);
            const cacheFrom = core.getMultilineInput('cacheFrom'); // TODO - handle this
            // const skipContainerUserIdUpdate = core.getBooleanInput(
            // 	'skipContainerUserIdUpdate'
            // ) // TODO - handle this
            // TODO - nocache
            // TODO - detect buildkit (override param??), add info/warning on no buildkit??
            const log = (message) => core.info(message);
            const workspaceFolder = path_1.default.resolve(checkoutPath, subFolder);
            const fullImageName = `${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`;
            if (!cacheFrom.includes(fullImageName)) {
                // If the cacheFrom options don't include the fullImageName, add it here
                // This ensures that when building a PR where the image specified in the action
                // isn't included in devcontainer.json (or docker-compose.yml), the action still
                // resolves a previous image for the tag as a layer cache (if pushed to a registry)
                cacheFrom.splice(0, 0, fullImageName);
            }
            const buildResult = yield core.group('build container', () => __awaiter(this, void 0, void 0, function* () {
                const args = {
                    workspaceFolder,
                    imageName: fullImageName,
                    additionalCacheFroms: cacheFrom
                };
                const result = yield dev_container_cli_1.devcontainer.build(args, log);
                if (result.outcome !== 'success') {
                    core.error(`Dev container build failed: ${result.message} (exit code: ${result.code})\n${result.description}`);
                    core.setFailed(result.message);
                }
                return result;
            }));
            if (buildResult.outcome !== 'success') {
                return;
            }
            const upResult = yield core.group('start container', () => __awaiter(this, void 0, void 0, function* () {
                const args = {
                    workspaceFolder,
                    additionalCacheFroms: cacheFrom
                };
                const result = yield dev_container_cli_1.devcontainer.up(args, log);
                if (result.outcome !== 'success') {
                    core.error(`Dev container up failed: ${result.message} (exit code: ${result.code})\n${result.description}`);
                    core.setFailed(result.message);
                }
                return result;
            }));
            if (upResult.outcome !== 'success') {
                return;
            }
            const execResult = yield core.group('Run command in container', () => __awaiter(this, void 0, void 0, function* () {
                const args = {
                    workspaceFolder,
                    command: ['bash', '-c', runCommand],
                    env: inputEnvsWithDefaults
                };
                const result = yield dev_container_cli_1.devcontainer.exec(args, log);
                if (result.outcome !== 'success') {
                    core.error(`Dev container exec: ${result.message} (exit code: ${result.code})\n${result.description}`);
                    core.setFailed(result.message);
                }
                return result;
            }));
            if (execResult.outcome !== 'success') {
                return;
            }
            // TODO - should we stop the container?
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function runPost() {
    return __awaiter(this, void 0, void 0, function* () {
        const pushOption = valueOrDefault(core.getInput('push'), 'filter');
        const refFilterForPush = core.getMultilineInput('refFilterForPush');
        const eventFilterForPush = core.getMultilineInput('eventFilterForPush');
        if (pushOption === 'never') {
            core.info(`Image push skipped because 'push' is set to '${pushOption}'`);
            return;
        }
        if (pushOption === 'filter') {
            // https://docs.github.com/en/actions/reference/environment-variables#default-environment-variables
            const ref = process.env.GITHUB_REF;
            if (refFilterForPush.length !== 0 && // empty filter allows all
                !refFilterForPush.some(s => s === ref)) {
                core.info(`Immage push skipped because GITHUB_REF (${ref}) is not in refFilterForPush`);
                return;
            }
            const eventName = process.env.GITHUB_EVENT_NAME;
            if (eventFilterForPush.length !== 0 && // empty filter allows all
                !eventFilterForPush.some(s => s === eventName)) {
                core.info(`Image push skipped because GITHUB_EVENT_NAME (${eventName}) is not in eventFilterForPush`);
                return;
            }
        }
        else if (pushOption !== 'always') {
            core.setFailed(`Unexpected push value ('${pushOption})'`);
            return;
        }
        const imageName = core.getInput('imageName', { required: true });
        const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
        core.info(`Pushing image ''${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}...`);
        yield docker_1.pushImage(imageName, imageTag);
    });
}
function valueOrDefault(value, defaultValue) {
    if (!value || value === '') {
        return defaultValue;
    }
    return value;
}
function emptyStringAsUndefined(value) {
    if (value === '') {
        return undefined;
    }
    return value;
}
run();
