"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTreeToString = exports.buildProcessTrees = exports.findProcesses = void 0;
async function findProcesses(shellServer) {
    const ps = 'for pid in `cd /proc && ls -d [0-9]*`; do { echo $pid ; readlink /proc/$pid/cwd ; readlink /proc/$pid/ns/mnt ; cat /proc/$pid/stat | tr "\n" " " ; echo ; xargs -0 < /proc/$pid/environ ; xargs -0 < /proc/$pid/cmdline ; } ; echo --- ; done ; readlink /proc/self/ns/mnt 2>/dev/null';
    const { stdout } = await shellServer.exec(ps, { logOutput: false });
    const n = 6;
    const sections = stdout.split('\n---\n');
    const mntNS = sections.pop().trim();
    const processes = sections
        .map(line => line.split('\n'))
        .filter(parts => parts.length >= n)
        .map(([pid, cwd, mntNS, stat, env, cmd]) => {
        const statM = /.*\) [^ ]* ([^ ]*) ([^ ]*)/.exec(stat) || [];
        return {
            pid,
            ppid: statM[1],
            pgrp: statM[2],
            cwd,
            mntNS,
            cmd,
            env: env.split(' ')
                .reduce((env, current) => {
                const i = current.indexOf('=');
                if (i !== -1) {
                    env[current.substr(0, i)] = current.substr(i + 1);
                }
                return env;
            }, {}),
        };
    });
    return {
        processes,
        mntNS,
    };
}
exports.findProcesses = findProcesses;
function buildProcessTrees(processes) {
    const index = {};
    processes.forEach(process => index[process.pid] = { process, childProcesses: [] });
    processes.filter(p => p.ppid)
        .forEach(p => { var _a; return (_a = index[p.ppid]) === null || _a === void 0 ? void 0 : _a.childProcesses.push(index[p.pid]); });
    return index;
}
exports.buildProcessTrees = buildProcessTrees;
function processTreeToString(tree, singleIndent = '  ', currentIndent = '  ') {
    return `${currentIndent}${tree.process.pid}: ${tree.process.cmd}
${tree.childProcesses.map(p => processTreeToString(p, singleIndent, currentIndent + singleIndent))}`;
}
exports.processTreeToString = processTreeToString;
