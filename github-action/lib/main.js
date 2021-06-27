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
            const subFolder = core.getInput('subFolder');
            const runCommand = core.getInput('runCmd', { required: true });
            const envs = core.getMultilineInput('env');
            const buildImageName = yield docker_1.buildImage(imageName, checkoutPath, subFolder);
            if (buildImageName === "") {
                return;
            }
            if (!(yield docker_1.runContainer(buildImageName, checkoutPath, subFolder, runCommand, envs))) {
                return;
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function runPost() {
    return __awaiter(this, void 0, void 0, function* () {
        const headRef = process.env.GITHUB_HEAD_REF;
        if (headRef) {
            // headRef only set on PR builds
            core.info('Image push skipped for PR builds');
            return;
        }
        const imageName = core.getInput('imageName', { required: true });
        yield docker_1.pushImage(imageName);
    });
}
run();
