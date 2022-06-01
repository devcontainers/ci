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
exports.runEdit = exports.createDocuments = exports.AllDocuments = exports.RemoteDocuments = exports.CLIHostDocuments = exports.fileDocuments = void 0;
const crypto = __importStar(require("crypto"));
const jsonc = __importStar(require("jsonc-parser"));
const util_1 = require("util");
const configurationCommonUtils_1 = require("./configurationCommonUtils");
const pfs_1 = require("../spec-utils/pfs");
exports.fileDocuments = {
    async readDocument(uri) {
        switch (uri.scheme) {
            case 'file':
                try {
                    const buffer = await (0, pfs_1.readLocalFile)(uri.fsPath);
                    return buffer.toString();
                }
                catch (err) {
                    if (err && err.code === 'ENOENT') {
                        return undefined;
                    }
                    throw err;
                }
            default:
                throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
    },
    async applyEdits(uri, edits, content) {
        switch (uri.scheme) {
            case 'file':
                const result = jsonc.applyEdits(content, edits);
                await (0, pfs_1.writeLocalFile)(uri.fsPath, result);
                break;
            default:
                throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
    }
};
class CLIHostDocuments {
    constructor(fileHost) {
        this.fileHost = fileHost;
    }
    async readDocument(uri) {
        switch (uri.scheme) {
            case CLIHostDocuments.scheme:
                try {
                    return (await this.fileHost.readFile((0, configurationCommonUtils_1.uriToFsPath)(uri, this.fileHost.platform))).toString();
                }
                catch (err) {
                    return undefined;
                }
            default:
                throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
    }
    async applyEdits(uri, edits, content) {
        switch (uri.scheme) {
            case CLIHostDocuments.scheme:
                const result = jsonc.applyEdits(content, edits);
                await this.fileHost.writeFile((0, configurationCommonUtils_1.uriToFsPath)(uri, this.fileHost.platform), Buffer.from(result));
                break;
            default:
                throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
    }
}
exports.CLIHostDocuments = CLIHostDocuments;
CLIHostDocuments.scheme = 'vscode-fileHost';
class RemoteDocuments {
    constructor(shellServer) {
        this.shellServer = shellServer;
    }
    async readDocument(uri) {
        switch (uri.scheme) {
            case RemoteDocuments.scheme:
                try {
                    const { stdout } = await this.shellServer.exec(`cat ${uri.path}`);
                    return stdout;
                }
                catch (err) {
                    return undefined;
                }
            default:
                throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
    }
    async applyEdits(uri, edits, content) {
        switch (uri.scheme) {
            case RemoteDocuments.scheme:
                try {
                    if (!RemoteDocuments.nonce) {
                        const buffer = await (0, util_1.promisify)(crypto.randomBytes)(20);
                        RemoteDocuments.nonce = buffer.toString('hex');
                    }
                    const result = jsonc.applyEdits(content, edits);
                    const eof = `EOF-${RemoteDocuments.nonce}`;
                    await this.shellServer.exec(`cat <<'${eof}' >${uri.path}
${result}
${eof}
`);
                }
                catch (err) {
                    console.log(err); // XXX
                }
                break;
            default:
                throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
    }
}
exports.RemoteDocuments = RemoteDocuments;
RemoteDocuments.scheme = 'vscode-remote';
class AllDocuments {
    constructor(documents) {
        this.documents = documents;
    }
    async readDocument(uri) {
        const documents = this.documents[uri.scheme];
        if (!documents) {
            throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
        return documents.readDocument(uri);
    }
    async applyEdits(uri, edits, content) {
        const documents = this.documents[uri.scheme];
        if (!documents) {
            throw new Error(`Unsupported scheme: ${uri.toString()}`);
        }
        return documents.applyEdits(uri, edits, content);
    }
}
exports.AllDocuments = AllDocuments;
function createDocuments(fileHost, shellServer) {
    const documents = {
        file: exports.fileDocuments,
        [CLIHostDocuments.scheme]: new CLIHostDocuments(fileHost),
    };
    if (shellServer) {
        documents[RemoteDocuments.scheme] = new RemoteDocuments(shellServer);
    }
    return new AllDocuments(documents);
}
exports.createDocuments = createDocuments;
const editQueues = new Map();
async function runEdit(uri, edit) {
    const uriString = uri.toString();
    let queue = editQueues.get(uriString);
    if (!queue) {
        editQueues.set(uriString, queue = []);
    }
    queue.push(edit);
    if (queue.length === 1) {
        while (queue.length) {
            await queue[0]();
            queue.shift();
        }
        editQueues.delete(uriString);
    }
}
exports.runEdit = runEdit;
