export interface DevContainerConfig {
    workspaceFolder?: string;
    remoteUser?: string;
    dockerFile?: string;
    context?: string;
    build?: {
        dockerfile?: string;
        context?: string;
        args?: Record<string, string>;
        cacheFrom?: string | string[];
        cacheTo?: string | string[];
    };
    runArgs?: string[];
    mounts?: string[];
}
export declare function loadFromFile(filepath: string): Promise<DevContainerConfig>;
export declare function loadFromString(content: string): DevContainerConfig;
export declare function getWorkspaceFolder(config: DevContainerConfig, repoPath: string): string;
export declare function getRemoteUser(config: DevContainerConfig): string;
export declare function getDockerfile(config: DevContainerConfig): string | undefined;
export declare function getContext(config: DevContainerConfig): string | undefined;
