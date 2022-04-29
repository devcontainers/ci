/// <reference types="node" />
import * as path from 'path';
import { URI } from 'vscode-uri';
import { FileHost } from '../spec-utils/pfs';
export { FileHost, FileTypeBitmask } from '../spec-utils/pfs';
export declare function uriToFsPath(uri: URI, platform: NodeJS.Platform): string;
export declare function getWellKnownDevContainerPaths(path_: typeof path.posix | typeof path.win32, folderPath: string): string[];
export declare function getDefaultDevContainerConfigPath(fileHost: FileHost, configFolderPath: string): URI;
export declare function getDevContainerConfigPathIn(fileHost: FileHost, configFolderPath: string): Promise<URI | undefined>;
export declare function parentURI(uri: URI): URI;
