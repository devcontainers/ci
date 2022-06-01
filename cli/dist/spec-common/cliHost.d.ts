/// <reference types="node" />
import * as path from 'path';
import { URI } from 'vscode-uri';
import { ExecFunction, PtyExecFunction } from './commonUtils';
import { Duplex } from 'pull-stream';
export declare type CLIHostType = 'local' | 'wsl' | 'container' | 'ssh';
export interface CLIHost {
    type: CLIHostType;
    platform: NodeJS.Platform;
    exec: ExecFunction;
    ptyExec: PtyExecFunction;
    cwd: string;
    env: NodeJS.ProcessEnv;
    path: typeof path.posix | typeof path.win32;
    homedir(): Promise<string>;
    tmpdir(): Promise<string>;
    isFile(filepath: string): Promise<boolean>;
    isFolder(filepath: string): Promise<boolean>;
    readFile(filepath: string): Promise<Buffer>;
    writeFile(filepath: string, content: Buffer): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    mkdirp(dirpath: string): Promise<void>;
    readDir(dirpath: string): Promise<string[]>;
    readDirWithTypes?(dirpath: string): Promise<[string, FileTypeBitmask][]>;
    getuid(): Promise<number>;
    getgid(): Promise<number>;
    toCommonURI(filePath: string): Promise<URI | undefined>;
    connect: ConnectFunction;
    reconnect?(): Promise<void>;
    terminate?(): Promise<void>;
}
export declare type ConnectFunction = (socketPath: string) => Duplex<Buffer, Buffer>;
export declare enum FileTypeBitmask {
    Unknown = 0,
    File = 1,
    Directory = 2,
    SymbolicLink = 64
}
export declare function getCLIHost(localCwd: string, loadNativeModule: <T>(moduleName: string) => Promise<T | undefined>): Promise<CLIHost>;
