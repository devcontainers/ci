"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSessions = void 0;
const proc_1 = require("../spec-common/proc");
async function findSessions(shellServer) {
    const { processes } = await (0, proc_1.findProcesses)(shellServer);
    return processes.filter(proc => 'VSCODE_REMOTE_CONTAINERS_SESSION' in proc.env) // TODO: Remove VS Code reference.
        .map(proc => ({
        ...proc,
        sessionId: proc.env.VSCODE_REMOTE_CONTAINERS_SESSION
    }));
}
exports.findSessions = findSessions;
