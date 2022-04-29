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
exports.isEqualOrParent = exports.canUseWorkspacePathInRemote = exports.isWorkspacePath = exports.workspaceFromPath = void 0;
const path = __importStar(require("path"));
const jsonc_parser_1 = require("jsonc-parser");
const vscode_uri_1 = require("vscode-uri"); // avoid vscode.Uri reference for tests
function workspaceFromPath(path_, workspaceOrFolderPath) {
    if (isWorkspacePath(workspaceOrFolderPath)) {
        const workspaceFolder = path_.dirname(workspaceOrFolderPath);
        return {
            isWorkspaceFile: true,
            workspaceOrFolderPath,
            rootFolderPath: workspaceFolder,
            configFolderPath: workspaceFolder, // have config file in workspaceFolder (to be discussed...)
        };
    }
    return {
        isWorkspaceFile: false,
        workspaceOrFolderPath,
        rootFolderPath: workspaceOrFolderPath,
        configFolderPath: workspaceOrFolderPath,
    };
}
exports.workspaceFromPath = workspaceFromPath;
function isWorkspacePath(workspaceOrFolderPath) {
    return path.extname(workspaceOrFolderPath) === '.code-workspace'; // TODO: Remove VS Code specific code.
}
exports.isWorkspacePath = isWorkspacePath;
async function canUseWorkspacePathInRemote(cliHost, workspace) {
    if (!workspace.isWorkspaceFile) {
        return undefined;
    }
    try {
        const rootFolder = workspace.rootFolderPath;
        const workspaceFileContent = (await cliHost.readFile(workspace.workspaceOrFolderPath)).toString();
        const workspaceFile = (0, jsonc_parser_1.parse)(workspaceFileContent);
        const folders = workspaceFile['folders'];
        if (folders && folders.length > 0) {
            for (const folder of folders) {
                const folderPath = folder['path'];
                let fullPath;
                if (!folderPath) {
                    const folderURI = folder['uri'];
                    if (!folderURI) {
                        return `Workspace contains a folder that defines neither a path nor a URI.`;
                    }
                    const uri = vscode_uri_1.URI.parse(folderURI);
                    if (uri.scheme !== 'file') {
                        return `Workspace contains folder '${folderURI}' not on the local file system.`;
                    }
                    return `Workspace contains an absolute folder path '${folderURI}'.`;
                }
                else {
                    if (cliHost.path.isAbsolute(folderPath)) {
                        return `Workspace contains an absolute folder path '${folderPath}'.`;
                    }
                    fullPath = cliHost.path.resolve(rootFolder, folderPath);
                }
                if (!isEqualOrParent(cliHost, fullPath, rootFolder)) {
                    return `Folder '${fullPath}' is not a subfolder of shared root folder '${rootFolder}'.`;
                }
            }
            return;
        }
        return `Workspace does not define any folders`;
    }
    catch (e) {
        return `Problems loading workspace file ${workspace.workspaceOrFolderPath}: ${e && (e.message || e.toString())}`;
    }
}
exports.canUseWorkspacePathInRemote = canUseWorkspacePathInRemote;
function isEqualOrParent(cliHost, c, parent) {
    if (c === parent) {
        return true;
    }
    if (!c || !parent) {
        return false;
    }
    if (parent.length > c.length) {
        return false;
    }
    if (c.length > parent.length && c.charAt(parent.length) !== cliHost.path.sep) {
        return false;
    }
    return equalPaths(cliHost.platform, parent, c.substr(0, parent.length));
}
exports.isEqualOrParent = isEqualOrParent;
function equalPaths(platform, a, b) {
    if (platform === 'linux') {
        return a === b;
    }
    return a.toLowerCase() === b.toLowerCase();
}
