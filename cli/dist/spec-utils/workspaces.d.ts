/// <reference types="node" />
import * as path from 'path';
export interface Workspace {
    readonly isWorkspaceFile: boolean;
    readonly workspaceOrFolderPath: string;
    readonly rootFolderPath: string;
    readonly configFolderPath: string;
}
export declare function workspaceFromPath(path_: typeof path.posix | typeof path.win32, workspaceOrFolderPath: string): Workspace;
export declare function isWorkspacePath(workspaceOrFolderPath: string): boolean;
export declare function canUseWorkspacePathInRemote(cliHost: {
    platform: NodeJS.Platform;
    path: typeof path.posix | typeof path.win32;
    readFile(filepath: string): Promise<Buffer>;
}, workspace: Workspace): Promise<string | undefined>;
export declare function isEqualOrParent(cliHost: {
    platform: NodeJS.Platform;
    path: typeof path.posix | typeof path.win32;
}, c: string, parent: string): boolean;
