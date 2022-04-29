/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import { URI } from 'vscode-uri';
export declare function isLocalFile(filepath: string): Promise<boolean>;
export declare function isLocalFolder(filepath: string): Promise<boolean>;
export declare const readLocalFile: typeof fs.readFile.__promisify__;
export declare const writeLocalFile: typeof fs.writeFile.__promisify__;
export declare const appendLocalFile: typeof fs.appendFile.__promisify__;
export declare const renameLocal: typeof fs.rename.__promisify__;
export declare const readLocalDir: typeof fs.readdir.__promisify__;
export declare const unlinkLocal: typeof fs.unlink.__promisify__;
export declare const mkdirpLocal: (path: string) => Promise<void>;
export declare const rmdirLocal: typeof fs.rmdir.__promisify__;
export declare const rmLocal: typeof fs.rm.__promisify__;
export declare const cpLocal: typeof fs.copyFile.__promisify__;
export interface FileHost {
    platform: NodeJS.Platform;
    path: typeof path.posix | typeof path.win32;
    isFile(filepath: string): Promise<boolean>;
    readFile(filepath: string): Promise<Buffer>;
    writeFile(filepath: string, content: Buffer): Promise<void>;
    readDir(dirpath: string): Promise<string[]>;
    readDirWithTypes?(dirpath: string): Promise<[string, FileTypeBitmask][]>;
    mkdirp(dirpath: string): Promise<void>;
    toCommonURI(filePath: string): Promise<URI | undefined>;
}
export declare enum FileTypeBitmask {
    Unknown = 0,
    File = 1,
    Directory = 2,
    SymbolicLink = 64
}
