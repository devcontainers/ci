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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const dev_container_cli_1 = require("../../common/src/dev-container-cli");
const docker_1 = require("./docker");
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
            const buildXInstalled = yield docker_1.isDockerBuildXInstalled();
            if (!buildXInstalled) {
                core.setFailed('docker buildx not available: add a step to set up with docker/setup-buildx-action');
                return;
            }
            const checkoutPath = core.getInput('checkoutPath');
            const imageName = core.getInput('imageName', { required: true });
            const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
            // const subFolder: string = core.getInput('subFolder') // TODO - handle this
            const runCommand = core.getInput('runCmd', { required: true });
            // const envs: string[] = core.getMultilineInput('env') // TODO - handle this
            // const cacheFrom: string[] = core.getMultilineInput('cacheFrom') // TODO - handle this
            // const skipContainerUserIdUpdate = core.getBooleanInput(
            // 	'skipContainerUserIdUpdate'
            // ) // TODO - handle this
            // TODO - nocache
            // TODO - support additional cacheFrom
            const log = (message) => core.info(message);
            const fullImageName = `${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`;
            const buildArgs = {
                workspaceFolder: checkoutPath,
                imageName: fullImageName
            };
            const buildResult = yield dev_container_cli_1.devcontainer.build(buildArgs, log);
            if (buildResult.outcome !== 'success') {
                core.error(`Dev container build failed: ${buildResult.message} (exit code: ${buildResult.code})\n${buildResult.description}`);
                core.setFailed(buildResult.message);
                return;
            }
            const upArgs = {
                workspaceFolder: checkoutPath
            };
            const upResult = yield dev_container_cli_1.devcontainer.up(upArgs, log);
            if (upResult.outcome !== 'success') {
                core.error(`Dev container up failed: ${upResult.message} (exit code: ${upResult.code})\n${upResult.description}`);
                core.setFailed(upResult.message);
                return;
            }
            const execArgs = {
                workspaceFolder: checkoutPath,
                command: ['bash', '-c', runCommand]
            };
            const execResult = yield dev_container_cli_1.devcontainer.exec(execArgs, log);
            if (execResult.outcome !== 'success') {
                core.error(`Dev container exec: ${execResult.message} (exit code: ${execResult.code})\n${execResult.description}`);
                core.setFailed(execResult.message);
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
