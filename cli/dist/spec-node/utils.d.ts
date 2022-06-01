/// <reference types="node" />
import { CLIHost } from '../spec-common/commonUtils';
import { Log } from '../spec-utils/log';
import { ContainerProperties, ResolverParameters } from '../spec-common/injectHeadless';
import { Workspace } from '../spec-utils/workspaces';
import { URI } from 'vscode-uri';
import { ShellServer } from '../spec-common/shellServer';
import { ContainerDetails, DockerCLIParameters, DockerComposeCLI } from '../spec-shutdown/dockerUtils';
import { DevContainerConfig, DevContainerFromDockerfileConfig } from '../spec-configuration/configuration';
import { Event } from '../spec-utils/event';
import { Mount } from '../spec-configuration/containerFeaturesConfiguration';
import { PackageConfiguration } from '../spec-utils/product';
export { getConfigFilePath, getDockerfilePath, isDockerFileConfig, resolveConfigFilePath } from '../spec-configuration/configuration';
export { uriToFsPath, parentURI } from '../spec-configuration/configurationCommonUtils';
export { CLIHostDocuments, Documents, createDocuments, Edit, fileDocuments, RemoteDocuments } from '../spec-configuration/editableFiles';
export { getPackageConfig } from '../spec-utils/product';
export declare type BindMountConsistency = 'consistent' | 'cached' | 'delegated' | undefined;
export declare function uriToWSLFsPath(uri: URI, cliHost: CLIHost): Promise<string>;
export declare type ParsedAuthority = DevContainerAuthority;
export declare type UpdateRemoteUserUIDDefault = 'never' | 'on' | 'off';
export interface DockerResolverParameters {
    common: ResolverParameters;
    parsedAuthority: ParsedAuthority | undefined;
    dockerCLI: string;
    dockerComposeCLI: () => Promise<DockerComposeCLI>;
    dockerEnv: NodeJS.ProcessEnv;
    workspaceMountConsistencyDefault: BindMountConsistency;
    mountWorkspaceGitRoot: boolean;
    updateRemoteUserUIDOnMacOS: boolean;
    cacheMount: 'volume' | 'bind' | 'none';
    removeOnStartup?: boolean | string;
    buildNoCache?: boolean;
    expectExistingContainer?: boolean;
    userRepositoryConfigurationPaths: string[];
    additionalMounts: Mount[];
    updateRemoteUserUIDDefault: UpdateRemoteUserUIDDefault;
    additionalCacheFroms: string[];
    buildKitVersion: string | null;
    isTTY: boolean;
}
export interface ResolverResult {
    params: ResolverParameters;
    properties: ContainerProperties;
    config: DevContainerConfig | undefined;
    resolvedAuthority: {
        extensionHostEnv?: {
            [key: string]: string | null;
        };
    };
    tunnelInformation: {
        environmentTunnels?: {
            remoteAddress: {
                port: number;
                host: string;
            };
            localAddress: string;
        }[];
    };
    isTrusted?: boolean;
    dockerParams: DockerResolverParameters | undefined;
    dockerContainerId: string | undefined;
    composeProjectName?: string;
}
export declare function startEventSeen(params: DockerResolverParameters, labels: Record<string, string>, canceled: Promise<void>, output: Log, trace: boolean): Promise<{
    started: Promise<void>;
}>;
export declare function inspectDockerImage(params: DockerResolverParameters, imageName: string, pullImageOnError: boolean): Promise<import("../spec-shutdown/dockerUtils").ImageDetails>;
export interface DevContainerAuthority {
    hostPath: string;
}
export declare function isDevContainerAuthority(authority: ParsedAuthority): authority is DevContainerAuthority;
export declare function getHostMountFolder(cliHost: CLIHost, folderPath: string, mountWorkspaceGitRoot: boolean, output: Log): Promise<string>;
export interface WorkspaceConfiguration {
    workspaceMount: string | undefined;
    workspaceFolder: string | undefined;
}
export declare function getWorkspaceConfiguration(cliHost: CLIHost, workspace: Workspace | undefined, config: DevContainerConfig, mountWorkspaceGitRoot: boolean, output: Log, consistency?: BindMountConsistency): Promise<WorkspaceConfiguration>;
export declare function getTunnelInformation(container: ContainerDetails): {
    environmentTunnels: {
        remoteAddress: {
            port: number;
            host: string;
        };
        localAddress: string;
    }[];
};
export declare function getDockerContextPath(cliHost: {
    platform: NodeJS.Platform;
}, config: DevContainerFromDockerfileConfig): URI;
export declare function createContainerProperties(params: DockerResolverParameters, containerId: string, remoteWorkspaceFolder: string | undefined, remoteUser: string | undefined, rootShellServer?: ShellServer): Promise<ContainerProperties>;
export declare function runUserCommand(params: DockerResolverParameters, command: string | string[] | undefined, onDidInput?: Event<string>): Promise<void>;
export declare function getFolderImageName(params: ResolverParameters | DockerCLIParameters): string;
export declare function getFolderHash(fsPath: string): string;
export declare function createFeaturesTempFolder(params: {
    cliHost: CLIHost;
    package: PackageConfiguration;
}): Promise<string>;
export declare function ensureDockerfileHasFinalStageName(dockerfile: string, defaultLastStageName: string): {
    lastStageName: string;
    modifiedDockerfile: string | undefined;
};
