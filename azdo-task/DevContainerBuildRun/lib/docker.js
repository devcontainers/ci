"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.pushImage = exports.runContainer = exports.buildImage = exports.isDockerBuildXInstalled = void 0;
const task = __importStar(require("azure-pipelines-task-lib/task"));
const docker = __importStar(require("../../../common/src/docker"));
const errors_1 = require("../../../common/src/errors");
const exec_1 = require("./exec");
function isDockerBuildXInstalled() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield docker.isDockerBuildXInstalled(exec_1.exec);
    });
}
exports.isDockerBuildXInstalled = isDockerBuildXInstalled;
function buildImage(imageName, imageTag, checkoutPath, subFolder, skipContainerUserIdUpdate, cacheFrom) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🏗 Building dev container...');
        try {
            return yield docker.buildImage(exec_1.exec, imageName, imageTag, checkoutPath, subFolder, skipContainerUserIdUpdate, cacheFrom);
        }
        catch (error) {
            task.setResult(task.TaskResult.Failed, (0, errors_1.errorToString)(error));
            return '';
        }
    });
}
exports.buildImage = buildImage;
function runContainer(imageName, imageTag, checkoutPath, subFolder, command, envs) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🏃‍♀️ Running dev container...');
        try {
            yield docker.runContainer(exec_1.exec, imageName, imageTag, checkoutPath, subFolder, command, envs);
            return true;
        }
        catch (error) {
            task.setResult(task.TaskResult.Failed, (0, errors_1.errorToString)(error));
            return false;
        }
    });
}
exports.runContainer = runContainer;
function pushImage(imageName, imageTag) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📌 Pushing image...');
        try {
            yield docker.pushImage(exec_1.exec, imageName, imageTag);
            return true;
        }
        catch (error) {
            task.setResult(task.TaskResult.Failed, (0, errors_1.errorToString)(error));
            return false;
        }
    });
}
exports.pushImage = pushImage;
