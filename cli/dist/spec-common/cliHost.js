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
exports.getCLIHost = exports.FileTypeBitmask = void 0;
const path = __importStar(require("path"));
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const pfs_1 = require("../spec-utils/pfs");
const vscode_uri_1 = require("vscode-uri");
const commonUtils_1 = require("./commonUtils");
const toPull = require('stream-to-pull-stream');
var FileTypeBitmask;
(function (FileTypeBitmask) {
    FileTypeBitmask[FileTypeBitmask["Unknown"] = 0] = "Unknown";
    FileTypeBitmask[FileTypeBitmask["File"] = 1] = "File";
    FileTypeBitmask[FileTypeBitmask["Directory"] = 2] = "Directory";
    FileTypeBitmask[FileTypeBitmask["SymbolicLink"] = 64] = "SymbolicLink";
})(FileTypeBitmask = exports.FileTypeBitmask || (exports.FileTypeBitmask = {}));
async function getCLIHost(localCwd, loadNativeModule) {
    const exec = (0, commonUtils_1.plainExec)(localCwd);
    const ptyExec = await (0, commonUtils_1.plainPtyExec)(localCwd, loadNativeModule);
    return createLocalCLIHostFromExecFunctions(localCwd, exec, ptyExec, connectLocal);
}
exports.getCLIHost = getCLIHost;
function createLocalCLIHostFromExecFunctions(localCwd, exec, ptyExec, connect) {
    return {
        type: 'local',
        platform: process.platform,
        exec,
        ptyExec,
        cwd: localCwd,
        env: process.env,
        path: path,
        homedir: async () => os.homedir(),
        tmpdir: async () => os.tmpdir(),
        isFile: pfs_1.isLocalFile,
        isFolder: pfs_1.isLocalFolder,
        readFile: pfs_1.readLocalFile,
        writeFile: pfs_1.writeLocalFile,
        rename: pfs_1.renameLocal,
        mkdirp: async (dirpath) => {
            await (0, pfs_1.mkdirpLocal)(dirpath);
        },
        readDir: pfs_1.readLocalDir,
        getuid: async () => process.getuid(),
        getgid: async () => process.getgid(),
        toCommonURI: async (filePath) => vscode_uri_1.URI.file(filePath),
        connect,
    };
}
function connectLocal(socketPath) {
    if (process.platform !== 'win32' || socketPath.startsWith('\\\\.\\pipe\\')) {
        return toPull.duplex(net.connect(socketPath));
    }
    const socket = new net.Socket();
    (async () => {
        const buf = await (0, pfs_1.readLocalFile)(socketPath);
        const i = buf.indexOf(0xa);
        const port = parseInt(buf.slice(0, i).toString(), 10);
        const guid = buf.slice(i + 1);
        socket.connect(port, '127.0.0.1', () => {
            socket.write(guid, err => {
                if (err) {
                    console.error(err);
                    socket.destroy();
                }
            });
        });
    })()
        .catch(err => {
        console.error(err);
        socket.destroy();
    });
    return toPull.duplex(socket);
}
