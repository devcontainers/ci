/// <reference types="node" />
import * as jsonc from 'jsonc-parser';
import { URI } from 'vscode-uri';
import { FileHost } from './configurationCommonUtils';
export declare type Edit = jsonc.Edit;
export interface Documents {
    readDocument(uri: URI): Promise<string | undefined>;
    applyEdits(uri: URI, edits: Edit[], content: string): Promise<void>;
}
export declare const fileDocuments: Documents;
export declare class CLIHostDocuments implements Documents {
    private fileHost;
    static scheme: string;
    constructor(fileHost: FileHost);
    readDocument(uri: URI): Promise<string | undefined>;
    applyEdits(uri: URI, edits: Edit[], content: string): Promise<void>;
}
export declare class RemoteDocuments implements Documents {
    private shellServer;
    static scheme: string;
    private static nonce;
    constructor(shellServer: ShellServer);
    readDocument(uri: URI): Promise<string | undefined>;
    applyEdits(uri: URI, edits: Edit[], content: string): Promise<void>;
}
export declare class AllDocuments implements Documents {
    private documents;
    constructor(documents: Record<string, Documents>);
    readDocument(uri: URI): Promise<string | undefined>;
    applyEdits(uri: URI, edits: Edit[], content: string): Promise<void>;
}
export declare function createDocuments(fileHost: FileHost, shellServer?: ShellServer): Documents;
export interface ShellServer {
    exec(cmd: string, options?: {
        logOutput?: boolean;
        stdin?: Buffer;
    }): Promise<{
        stdout: string;
        stderr: string;
    }>;
}
export declare function runEdit(uri: URI, edit: () => Promise<void>): Promise<void>;
