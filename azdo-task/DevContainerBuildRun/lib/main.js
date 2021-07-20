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
const task = __importStar(require("azure-pipelines-task-lib/task"));
const docker_1 = require("./docker");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('DevContainerBuildRun starting...');
        const hasRunMain = task.getTaskVariable('hasRunMain');
        if (hasRunMain === 'true') {
            console.log('DevContainerBuildRun running post step...');
            return yield runPost();
        }
        else {
            console.log('DevContainerBuildRun running main step...');
            task.setTaskVariable('hasRunMain', 'true');
            return yield runMain();
        }
    });
}
function runMain() {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const buildXInstalled = yield docker_1.isDockerBuildXInstalled();
            if (!buildXInstalled) {
                task.setResult(task.TaskResult.Failed, 'docker buildx not available: add a step to set up with docker/setup-buildx-action');
                return;
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
            const skipContainerUserIdUpdate = ((_e = task.getInput('skipContainerUserIdUpdate')) !== null && _e !== void 0 ? _e : 'false') === 'true';
            const buildImageName = yield docker_1.buildImage(imageName, imageTag, checkoutPath, subFolder, skipContainerUserIdUpdate);
            if (buildImageName === '') {
                return;
            }
            if (!(yield docker_1.runContainer(buildImageName, imageTag, checkoutPath, subFolder, runCommand, envs))) {
                return;
            }
        }
        catch (err) {
            task.setResult(task.TaskResult.Failed, err.message);
        }
    });
}
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
run();
