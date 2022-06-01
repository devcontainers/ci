/// <reference types="node" />
import { URI } from 'vscode-uri';
export interface SubstitutionContext {
    platform: NodeJS.Platform;
    configFile: URI;
    localWorkspaceFolder: string | undefined;
    containerWorkspaceFolder: string | undefined;
    env: NodeJS.ProcessEnv;
}
export declare function substitute<T extends object>(context: SubstitutionContext, value: T): T;
export declare function containerSubstitute<T extends object>(platform: NodeJS.Platform, configFile: URI | undefined, containerEnv: NodeJS.ProcessEnv, value: T): T;
