"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTypeBitmask = exports.cpLocal = exports.rmLocal = exports.rmdirLocal = exports.mkdirpLocal = exports.unlinkLocal = exports.readLocalDir = exports.renameLocal = exports.appendLocalFile = exports.writeLocalFile = exports.readLocalFile = exports.isLocalFolder = exports.isLocalFile = void 0;
const fs = __importStar(require("fs"));
const util_1 = require("util");
function isLocalFile(filepath) {
    return new Promise(r => fs.stat(filepath, (err, stat) => r(!err && stat.isFile())));
}
exports.isLocalFile = isLocalFile;
function isLocalFolder(filepath) {
    return new Promise(r => fs.stat(filepath, (err, stat) => r(!err && stat.isDirectory())));
}
exports.isLocalFolder = isLocalFolder;
exports.readLocalFile = (0, util_1.promisify)(fs.readFile);
exports.writeLocalFile = (0, util_1.promisify)(fs.writeFile);
exports.appendLocalFile = (0, util_1.promisify)(fs.appendFile);
exports.renameLocal = (0, util_1.promisify)(fs.rename);
exports.readLocalDir = (0, util_1.promisify)(fs.readdir);
exports.unlinkLocal = (0, util_1.promisify)(fs.unlink);
const mkdirpLocal = (path) => new Promise((res, rej) => fs.mkdir(path, { recursive: true }, err => err ? rej(err) : res()));
exports.mkdirpLocal = mkdirpLocal;
exports.rmdirLocal = (0, util_1.promisify)(fs.rmdir);
exports.rmLocal = (0, util_1.promisify)(fs.rm);
exports.cpLocal = (0, util_1.promisify)(fs.copyFile);
var FileTypeBitmask;
(function (FileTypeBitmask) {
    FileTypeBitmask[FileTypeBitmask["Unknown"] = 0] = "Unknown";
    FileTypeBitmask[FileTypeBitmask["File"] = 1] = "File";
    FileTypeBitmask[FileTypeBitmask["Directory"] = 2] = "Directory";
    FileTypeBitmask[FileTypeBitmask["SymbolicLink"] = 64] = "SymbolicLink";
})(FileTypeBitmask = exports.FileTypeBitmask || (exports.FileTypeBitmask = {}));
