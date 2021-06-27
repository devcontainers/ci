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
exports.getContext = exports.getDockerfile = exports.getRemoteUser = exports.getWorkspaceFolder = exports.loadFromString = exports.loadFromFile = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const jsoncParser = __importStar(require("jsonc-parser"));
const { readFile } = fs.promises;
function loadFromFile(filepath) {
    return __awaiter(this, void 0, void 0, function* () {
        const jsonContent = yield readFile(filepath);
        return loadFromString(jsonContent.toString());
    });
}
exports.loadFromFile = loadFromFile;
function loadFromString(content) {
    const config = jsoncParser.parse(content);
    return config;
}
exports.loadFromString = loadFromString;
function getWorkspaceFolder(config, repoPath) {
    // TODO - need to check workspaceMount/workspaceFolder to set the source mount (https://github.com/stuartleeks/devcontainer-build-run/issues/66)
    // // https://code.visualstudio.com/docs/remote/containers-advanced#_changing-the-default-source-code-mount
    // if (config.workspaceFolder) {
    // 	return config.workspaceFolder
    // }
    return path.join('/workspaces', path.basename(repoPath));
}
exports.getWorkspaceFolder = getWorkspaceFolder;
function getRemoteUser(config) {
    var _a;
    // https://code.visualstudio.com/docs/remote/containers-advanced#_specifying-a-user-for-vs-code
    return (_a = config.remoteUser) !== null && _a !== void 0 ? _a : 'root';
}
exports.getRemoteUser = getRemoteUser;
function getDockerfile(config) {
    var _a, _b;
    return (_b = (_a = config.build) === null || _a === void 0 ? void 0 : _a.dockerfile) !== null && _b !== void 0 ? _b : config.dockerFile;
}
exports.getDockerfile = getDockerfile;
function getContext(config) {
    var _a, _b;
    return (_b = (_a = config.build) === null || _a === void 0 ? void 0 : _a.context) !== null && _b !== void 0 ? _b : config.context;
}
exports.getContext = getContext;
