"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGroup = exports.parsePasswd = void 0;
function parsePasswd(input) {
    const result = [];
    const lines = input.split('\n');
    for (const line of lines) {
        const parts = line.split(':');
        const user = {
            name: parts[0],
            uid: parts[2],
            gid: parts[3],
        };
        result.push(user);
    }
    return result;
}
exports.parsePasswd = parsePasswd;
function parseGroup(input) {
    const result = [];
    const lines = input.split('\n');
    for (const line of lines) {
        const parts = line.split(':');
        const group = {
            name: parts[0],
            gid: parts[2],
            users: parts[3] ? parts[3].split(',') : [],
        };
        result.push(group);
    }
    return result;
}
exports.parseGroup = parseGroup;
