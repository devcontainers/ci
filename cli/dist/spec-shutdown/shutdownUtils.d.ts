import { ShellServer } from '../spec-common/shellServer';
export declare function findSessions(shellServer: ShellServer): Promise<{
    sessionId: string;
    pid: string;
    ppid: string | undefined;
    pgrp: string | undefined;
    cwd: string;
    mntNS: string;
    cmd: string;
    env: Record<string, string>;
}[]>;
