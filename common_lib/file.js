"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbsolutePath = void 0;
const path_1 = __importDefault(require("path"));
function getAbsolutePath(inputPath, referencePath) {
    if (path_1.default.isAbsolute(inputPath)) {
        return inputPath;
    }
    return path_1.default.join(referencePath, inputPath);
}
exports.getAbsolutePath = getAbsolutePath;
