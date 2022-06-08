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
exports.runPost = exports.runMain = void 0;
const task = __importStar(require("azure-pipelines-task-lib/task"));
const task_1 = require("azure-pipelines-task-lib/task");
const path_1 = __importDefault(require("path"));
const envvars_1 = require("../../../common/src/envvars");
const dev_container_cli_1 = require("../../../common/src/dev-container-cli");
const docker_1 = require("./docker");
const exec_1 = require("./exec");
function runMain() {
    var _a, _b, _c, _d, _e, _f, _g;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            task.setTaskVariable('hasRunMain', 'true');
            const buildXInstalled = yield docker_1.isDockerBuildXInstalled();
            if (!buildXInstalled) {
                console.log('### WARNING: docker buildx not available: add a step to set up with docker/setup-buildx-action - see https://github.com/devcontainers/ci/blob/main/docs/azure-devops-task.md');
                return;
            }
            const devContainerCliInstalled = yield dev_container_cli_1.devcontainer.isCliInstalled(exec_1.exec);
            if (!devContainerCliInstalled) {
                console.log('Installing @devcontainers/cli...');
                const success = yield dev_container_cli_1.devcontainer.installCli(exec_1.exec);
                if (!success) {
                    task.setResult(task.TaskResult.Failed, '@devcontainers/cli install failed!');
                    return;
                }
            }
            const checkoutPath = (_a = task.getInput('checkoutPath')) !== null && _a !== void 0 ? _a : '';
            const imageName = task.getInput('imageName', true);
            if (!imageName) {
                task.setResult(task.TaskResult.Failed, 'imageName input is required');
                return;
            }
            const imageTag = task.getInput('imageTag');
            const subFolder = (_b = task.getInput('subFolder')) !== null && _b !== void 0 ? _b : '.';
            const runCommand = task.getInput('runCmd', true);
            if (!runCommand) {
                task.setResult(task.TaskResult.Failed, 'runCmd input is required');
                return;
            }
            const envs = (_d = (_c = task.getInput('env')) === null || _c === void 0 ? void 0 : _c.split('\n')) !== null && _d !== void 0 ? _d : [];
            const inputEnvsWithDefaults = envvars_1.populateDefaults(envs);
            const cacheFrom = (_f = (_e = task.getInput('cacheFrom')) === null || _e === void 0 ? void 0 : _e.split('\n')) !== null && _f !== void 0 ? _f : [];
            const skipContainerUserIdUpdate = ((_g = task.getInput('skipContainerUserIdUpdate')) !== null && _g !== void 0 ? _g : 'false') === 'true';
            const log = (message) => console.log(message);
            const workspaceFolder = path_1.default.resolve(checkoutPath, subFolder);
            const fullImageName = `${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}`;
            if (!cacheFrom.includes(fullImageName)) {
                // If the cacheFrom options don't include the fullImageName, add it here
                // This ensures that when building a PR where the image specified in the action
                // isn't included in devcontainer.json (or docker-compose.yml), the action still
                // resolves a previous image for the tag as a layer cache (if pushed to a registry)
                cacheFrom.splice(0, 0, fullImageName);
            }
            const buildArgs = {
                workspaceFolder,
                imageName: fullImageName,
                additionalCacheFroms: cacheFrom,
            };
            console.log('\n\n');
            console.log('***');
            console.log('*** Building the dev container');
            console.log('***');
            const buildResult = yield dev_container_cli_1.devcontainer.build(buildArgs, log);
            if (buildResult.outcome !== 'success') {
                console.log(`### ERROR: Dev container build failed: ${buildResult.message} (exit code: ${buildResult.code})\n${buildResult.description}`);
                task.setResult(task_1.TaskResult.Failed, buildResult.message);
            }
            if (buildResult.outcome !== 'success') {
                return;
            }
            console.log('\n\n');
            console.log('***');
            console.log('*** Starting the dev container');
            console.log('***');
            const upArgs = {
                workspaceFolder,
                additionalCacheFroms: cacheFrom,
                skipContainerUserIdUpdate,
            };
            const upResult = yield dev_container_cli_1.devcontainer.up(upArgs, log);
            if (upResult.outcome !== 'success') {
                console.log(`### ERROR: Dev container up failed: ${upResult.message} (exit code: ${upResult.code})\n${upResult.description}`);
                task.setResult(task_1.TaskResult.Failed, upResult.message);
            }
            if (upResult.outcome !== 'success') {
                return;
            }
            console.log('\n\n');
            console.log('***');
            console.log('*** Running command in the dev container');
            console.log('***');
            const execArgs = {
                workspaceFolder,
                command: ['bash', '-c', runCommand],
                env: inputEnvsWithDefaults,
            };
            const execResult = yield dev_container_cli_1.devcontainer.exec(execArgs, log);
            if (execResult.outcome !== 'success') {
                console.log(`### ERROR: Dev container exec: ${execResult.message} (exit code: ${execResult.code})\n${execResult.description}`);
                task.setResult(task_1.TaskResult.Failed, execResult.message);
            }
            if (execResult.outcome !== 'success') {
                return;
            }
            // TODO - should we stop the container?
        }
        catch (err) {
            task.setResult(task.TaskResult.Failed, err.message);
        }
    });
}
exports.runMain = runMain;
function runPost() {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const pushOption = (_a = task.getInput('push')) !== null && _a !== void 0 ? _a : 'filter';
        const pushOnFailedBuild = ((_b = task.getInput('pushOnFailedBuild')) !== null && _b !== void 0 ? _b : 'false') === 'true';
        if (pushOption === 'never') {
            console.log(`Image push skipped because 'push' is set to '${pushOption}'`);
            return;
        }
        if (pushOption === 'filter') {
            // https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
            const agentJobStatus = process.env.AGENT_JOBSTATUS;
            switch (agentJobStatus) {
                case 'Succeeded':
                case 'SucceededWithIssues':
                    // continue
                    break;
                default:
                    if (!pushOnFailedBuild) {
                        console.log(`Image push skipped because Agent JobStatus is '${agentJobStatus}'`);
                        return;
                    }
            }
            const buildReasonsForPush = (_d = (_c = task.getInput('buildReasonsForPush')) === null || _c === void 0 ? void 0 : _c.split('\n')) !== null && _d !== void 0 ? _d : [];
            const sourceBranchFilterForPush = (_f = (_e = task.getInput('sourceBranchFilterForPush')) === null || _e === void 0 ? void 0 : _e.split('\n')) !== null && _f !== void 0 ? _f : [];
            // check build reason is allowed
            const buildReason = process.env.BUILD_REASON;
            if (buildReasonsForPush.length !== 0 && // empty filter allows all
                !buildReasonsForPush.some(s => s === buildReason)) {
                console.log(`Image push skipped because buildReason (${buildReason}) is not in buildReasonsForPush`);
                return;
            }
            // check branch is allowed
            const sourceBranch = process.env.BUILD_SOURCEBRANCH;
            if (sourceBranchFilterForPush.length !== 0 && // empty filter allows all
                !sourceBranchFilterForPush.some(s => s === sourceBranch)) {
                console.log(`Image push skipped because source branch (${sourceBranch}) is not in sourceBranchFilterForPush`);
                return;
            }
        }
        const imageName = task.getInput('imageName', true);
        if (!imageName) {
            task.setResult(task.TaskResult.Failed, 'imageName input is required');
            return;
        }
        const imageTag = task.getInput('imageTag');
        console.log(`Pushing image ''${imageName}:${imageTag !== null && imageTag !== void 0 ? imageTag : 'latest'}...`);
        yield docker_1.pushImage(imageName, imageTag);
    });
}
exports.runPost = runPost;
