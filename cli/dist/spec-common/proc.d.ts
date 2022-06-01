import { ShellServer } from './shellServer';
export interface Process {
    pid: string;
    ppid: string | undefined;
    pgrp: string | undefined;
    cwd: string;
    mntNS: string;
    cmd: string;
    env: Record<string, string>;
}
export declare function findProcesses(shellServer: ShellServer): Promise<{
    processes: Process[];
    mntNS: string;
}>;
export interface ProcessTree {
    process: Process;
    childProcesses: ProcessTree[];
}
export declare function buildProcessTrees(processes: Process[]): Record<string, ProcessTree>;
export declare function processTreeToString(tree: ProcessTree, singleIndent?: string, currentIndent?: string): string;
