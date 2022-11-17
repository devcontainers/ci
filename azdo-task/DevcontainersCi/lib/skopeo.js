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
exports.copyImage = exports.isSkopeoInstalled = void 0;
const task = __importStar(require("azure-pipelines-task-lib/task"));
const skopeo = __importStar(require("../../../common/src/skopeo"));
const exec_1 = require("./exec");
function isSkopeoInstalled() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield skopeo.isSkopeoInstalled(exec_1.exec);
    });
}
exports.isSkopeoInstalled = isSkopeoInstalled;
function copyImage(all, source, dest) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📌 Copying image...');
        try {
            yield skopeo.copyImage(exec_1.exec, all, source, dest);
            return true;
        }
        catch (error) {
            task.setResult(task.TaskResult.Failed, error);
            return false;
        }
    });
}
exports.copyImage = copyImage;
