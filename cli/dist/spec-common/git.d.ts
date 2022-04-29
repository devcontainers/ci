/// <reference types="node" />
import { CLIHost } from './commonUtils';
import { Log } from '../spec-utils/log';
import { FileHost } from '../spec-utils/pfs';
export declare function findGitRootFolder(cliHost: FileHost | CLIHost, folderPath: string, output: Log): Promise<string | undefined>;
export interface GitCloneOptions {
    url: string;
    tokenEnvVar?: string;
    branch?: string;
    recurseSubmodules?: boolean;
    env?: NodeJS.ProcessEnv;
    fullClone?: boolean;
}
