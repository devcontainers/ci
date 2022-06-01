/// <reference types="node" />
import { Writable, Readable } from 'stream';
import * as fs from 'fs';
import * as cp from 'child_process';
import { Event } from '../spec-utils/event';
import { Log } from '../spec-utils/log';
import { ShellServer } from './shellServer';
export { CLIHost, getCLIHost } from './cliHost';
export interface Exec {
    stdin: Writable;
    stdout: Readable;
    stderr: Readable;
    exit: Promise<{
        code: number | null;
        signal: string | null;
    }>;
    terminate(): Promise<void>;
}
export interface ExecParameters {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    cmd: string;
    args?: string[];
    output: Log;
}
export interface ExecFunction {
    (params: ExecParameters): Promise<Exec>;
}
export interface PtyExec {
    onData: Event<string>;
    write(data: string): void;
    resize(cols: number, rows: number): void;
    exit: Promise<{
        code: number | undefined;
        signal: number | undefined;
    }>;
    terminate(): Promise<void>;
}
export interface PtyExecParameters {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    cmd: string;
    args?: string[];
    cols?: number;
    rows?: number;
    output: Log;
}
export interface PtyExecFunction {
    (params: PtyExecParameters): Promise<PtyExec>;
}
export declare function equalPaths(platform: NodeJS.Platform, a: string, b: string): boolean;
export declare const tsnode: string;
export declare const isTsnode: boolean;
export declare function runCommandNoPty(options: {
    exec: ExecFunction;
    cmd: string;
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdin?: Buffer | fs.ReadStream | Event<string>;
    output: Log;
    print?: boolean | 'continuous' | 'onerror';
}): Promise<{
    stdout: Buffer;
    stderr: Buffer;
}>;
export declare function runCommand(options: {
    ptyExec: PtyExecFunction;
    cmd: string;
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    output: Log;
    resolveOn?: RegExp;
    onDidInput?: Event<string>;
}): Promise<{
    cmdOutput: string;
}>;
export declare function plainExec(defaultCwd: string | undefined): ExecFunction;
export declare function plainPtyExec(defaultCwd: string | undefined, loadNativeModule: <T>(moduleName: string) => Promise<T | undefined>): Promise<PtyExecFunction>;
export declare function parseVersion(str: string): number[] | undefined;
export declare function isEarlierVersion(left: number[], right: number[]): boolean;
export declare const fork: ((mod: string, args: readonly string[] | undefined, options: any) => cp.ChildProcessWithoutNullStreams) | typeof cp.fork;
export declare function loadNativeModule<T>(moduleName: string): Promise<T | undefined>;
export declare type PlatformSwitch<T> = T | {
    posix: T;
    win32: T;
};
export declare function platformDispatch<T>(platform: NodeJS.Platform, platformSwitch: PlatformSwitch<T>): T;
export declare function isFile(shellServer: ShellServer, location: string): Promise<boolean>;
