/// <reference types="node" />
import { URI } from 'vscode-uri';
import { FileHost } from './configurationCommonUtils';
export declare type DevContainerConfig = DevContainerFromImageConfig | DevContainerFromDockerfileConfig | DevContainerFromDockerComposeConfig;
export interface PortAttributes {
    label: string | undefined;
    onAutoForward: string | undefined;
    elevateIfNeeded: boolean | undefined;
}
export declare type UserEnvProbe = 'none' | 'loginInteractiveShell' | 'interactiveShell' | 'loginShell';
export declare type DevContainerConfigCommand = 'initializeCommand' | 'onCreateCommand' | 'updateContentCommand' | 'postCreateCommand' | 'postStartCommand' | 'postAttachCommand';
export interface HostRequirements {
    cpus?: number;
    memory?: string;
    storage?: string;
}
export interface DevContainerFromImageConfig {
    configFilePath: URI;
    image: string;
    name?: string;
    forwardPorts?: (number | string)[];
    appPort?: number | string | (number | string)[];
    portsAttributes?: Record<string, PortAttributes>;
    otherPortsAttributes?: PortAttributes;
    runArgs?: string[];
    shutdownAction?: 'none' | 'stopContainer';
    overrideCommand?: boolean;
    initializeCommand?: string | string[];
    onCreateCommand?: string | string[];
    updateContentCommand?: string | string[];
    postCreateCommand?: string | string[];
    postStartCommand?: string | string[];
    postAttachCommand?: string | string[];
    waitFor?: DevContainerConfigCommand;
    /** remote path to folder or workspace */
    workspaceFolder?: string;
    workspaceMount?: string;
    mounts?: string[];
    containerEnv?: Record<string, string>;
    remoteEnv?: Record<string, string | null>;
    containerUser?: string;
    remoteUser?: string;
    updateRemoteUserUID?: boolean;
    userEnvProbe?: UserEnvProbe;
    features?: Record<string, string | boolean | Record<string, string | boolean>>;
    hostRequirements?: HostRequirements;
}
export declare type DevContainerFromDockerfileConfig = {
    configFilePath: URI;
    name?: string;
    forwardPorts?: (number | string)[];
    appPort?: number | string | (number | string)[];
    portsAttributes?: Record<string, PortAttributes>;
    otherPortsAttributes?: PortAttributes;
    runArgs?: string[];
    shutdownAction?: 'none' | 'stopContainer';
    overrideCommand?: boolean;
    initializeCommand?: string | string[];
    onCreateCommand?: string | string[];
    updateContentCommand?: string | string[];
    postCreateCommand?: string | string[];
    postStartCommand?: string | string[];
    postAttachCommand?: string | string[];
    waitFor?: DevContainerConfigCommand;
    /** remote path to folder or workspace */
    workspaceFolder?: string;
    workspaceMount?: string;
    mounts?: string[];
    containerEnv?: Record<string, string>;
    remoteEnv?: Record<string, string | null>;
    containerUser?: string;
    remoteUser?: string;
    updateRemoteUserUID?: boolean;
    userEnvProbe?: UserEnvProbe;
    features?: Record<string, string | boolean | Record<string, string | boolean>>;
    hostRequirements?: HostRequirements;
} & ({
    dockerFile: string;
    context?: string;
    build?: {
        target?: string;
        args?: Record<string, string>;
        cacheFrom?: string | string[];
    };
} | {
    build: {
        dockerfile: string;
        context?: string;
        target?: string;
        args?: Record<string, string>;
        cacheFrom?: string | string[];
    };
});
export interface DevContainerFromDockerComposeConfig {
    configFilePath: URI;
    dockerComposeFile: string | string[];
    service: string;
    workspaceFolder: string;
    name?: string;
    forwardPorts?: (number | string)[];
    portsAttributes?: Record<string, PortAttributes>;
    otherPortsAttributes?: PortAttributes;
    shutdownAction?: 'none' | 'stopCompose';
    overrideCommand?: boolean;
    initializeCommand?: string | string[];
    onCreateCommand?: string | string[];
    updateContentCommand?: string | string[];
    postCreateCommand?: string | string[];
    postStartCommand?: string | string[];
    postAttachCommand?: string | string[];
    waitFor?: DevContainerConfigCommand;
    runServices?: string[];
    remoteEnv?: Record<string, string | null>;
    remoteUser?: string;
    updateRemoteUserUID?: boolean;
    userEnvProbe?: UserEnvProbe;
    features?: Record<string, string | boolean | Record<string, string | boolean>>;
    hostRequirements?: HostRequirements;
}
interface DevContainerVSCodeConfig {
    extensions?: string[];
    settings?: object;
    devPort?: number;
}
export declare function updateFromOldProperties<T extends DevContainerConfig & DevContainerVSCodeConfig & {
    customizations?: {
        vscode?: DevContainerVSCodeConfig;
    };
}>(original: T): T;
export declare function getConfigFilePath(cliHost: {
    platform: NodeJS.Platform;
}, config: {
    configFilePath: URI;
}, relativeConfigFilePath: string): URI;
export declare function resolveConfigFilePath(cliHost: {
    platform: NodeJS.Platform;
}, configFilePath: URI, relativeConfigFilePath: string): URI;
export declare function isDockerFileConfig(config: DevContainerConfig): config is DevContainerFromDockerfileConfig;
export declare function getDockerfilePath(cliHost: {
    platform: NodeJS.Platform;
}, config: DevContainerFromDockerfileConfig): URI;
export declare function getDockerfile(config: DevContainerFromDockerfileConfig): string;
export declare function getDockerComposeFilePaths(cliHost: FileHost, config: DevContainerFromDockerComposeConfig, envForComposeFile?: NodeJS.ProcessEnv, cwdForDefaultFiles?: string): Promise<string[]>;
export {};
