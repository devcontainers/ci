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
exports.parentURI = exports.getDevContainerConfigPathIn = exports.getDefaultDevContainerConfigPath = exports.getWellKnownDevContainerPaths = exports.uriToFsPath = exports.FileTypeBitmask = void 0;
const path = __importStar(require("path"));
const vscode_uri_1 = require("vscode-uri");
const editableFiles_1 = require("./editableFiles");
var pfs_1 = require("../spec-utils/pfs");
Object.defineProperty(exports, "FileTypeBitmask", { enumerable: true, get: function () { return pfs_1.FileTypeBitmask; } });
function uriToFsPath(uri, platform) {
    let value;
    if (uri.authority && uri.path.length > 1 && (uri.scheme === 'file' || uri.scheme === editableFiles_1.CLIHostDocuments.scheme)) {
        // unc path: file://shares/c$/far/boo
        value = `//${uri.authority}${uri.path}`;
    }
    else if (uri.path.charCodeAt(0) === 47 /* Slash */
        && (uri.path.charCodeAt(1) >= 65 /* A */ && uri.path.charCodeAt(1) <= 90 /* Z */ || uri.path.charCodeAt(1) >= 97 /* a */ && uri.path.charCodeAt(1) <= 122 /* z */)
        && uri.path.charCodeAt(2) === 58 /* Colon */) {
        // windows drive letter: file:///c:/far/boo
        value = uri.path[1].toLowerCase() + uri.path.substr(2);
    }
    else {
        // other path
        value = uri.path;
    }
    if (platform === 'win32') {
        value = value.replace(/\//g, '\\');
    }
    return value;
}
exports.uriToFsPath = uriToFsPath;
function getWellKnownDevContainerPaths(path_, folderPath) {
    return [
        path_.join(folderPath, '.devcontainer', 'devcontainer.json'),
        path_.join(folderPath, '.devcontainer.json'),
    ];
}
exports.getWellKnownDevContainerPaths = getWellKnownDevContainerPaths;
function getDefaultDevContainerConfigPath(fileHost, configFolderPath) {
    return vscode_uri_1.URI.file(fileHost.path.join(configFolderPath, '.devcontainer', 'devcontainer.json'))
        .with({ scheme: editableFiles_1.CLIHostDocuments.scheme });
}
exports.getDefaultDevContainerConfigPath = getDefaultDevContainerConfigPath;
async function getDevContainerConfigPathIn(fileHost, configFolderPath) {
    const possiblePaths = getWellKnownDevContainerPaths(fileHost.path, configFolderPath);
    for (let possiblePath of possiblePaths) {
        if (await fileHost.isFile(possiblePath)) {
            return vscode_uri_1.URI.file(possiblePath)
                .with({ scheme: editableFiles_1.CLIHostDocuments.scheme });
        }
    }
    return undefined;
}
exports.getDevContainerConfigPathIn = getDevContainerConfigPathIn;
function parentURI(uri) {
    const parent = path.posix.dirname(uri.path);
    return uri.with({ path: parent });
}
exports.parentURI = parentURI;
