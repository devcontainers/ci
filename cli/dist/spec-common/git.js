"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGitRootFolder = void 0;
const commonUtils_1 = require("./commonUtils");
async function findGitRootFolder(cliHost, folderPath, output) {
    if (!('exec' in cliHost)) {
        for (let current = folderPath, previous = ''; current !== previous; previous = current, current = cliHost.path.dirname(current)) {
            if (await cliHost.isFile(cliHost.path.join(current, '.git', 'config'))) {
                return current;
            }
        }
        return undefined;
    }
    try {
        // Preserves symlinked paths (unlike --show-toplevel).
        const { stdout } = await (0, commonUtils_1.runCommandNoPty)({
            exec: cliHost.exec,
            cmd: 'git',
            args: ['rev-parse', '--show-cdup'],
            cwd: folderPath,
            output,
        });
        const cdup = stdout.toString().trim();
        return cliHost.path.resolve(folderPath, cdup);
    }
    catch {
        return undefined;
    }
}
exports.findGitRootFolder = findGitRootFolder;
