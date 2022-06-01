import { ResolverResult, DockerResolverParameters } from './utils';
import { Workspace } from '../spec-utils/workspaces';
import { DockerCLIParameters, PartialExecParameters, DockerComposeCLI } from '../spec-shutdown/dockerUtils';
import { DevContainerFromDockerComposeConfig } from '../spec-configuration/configuration';
import { CollapsedFeaturesConfig } from '../spec-configuration/containerFeaturesConfiguration';
export declare function openDockerComposeDevContainer(params: DockerResolverParameters, workspace: Workspace, config: DevContainerFromDockerComposeConfig, idLabels: string[]): Promise<ResolverResult>;
export declare function getRemoteWorkspaceFolder(config: DevContainerFromDockerComposeConfig): string;
export declare function buildAndExtendDockerCompose(config: DevContainerFromDockerComposeConfig, projectName: string, params: DockerResolverParameters, localComposeFiles: string[], envFile: string | undefined, composeGlobalArgs: string[], runServices: string[], noCache: boolean, overrideFilePath: string, overrideFilePrefix: string, additionalCacheFroms?: string[]): Promise<{
    collapsedFeaturesConfig: CollapsedFeaturesConfig | undefined;
    additionalComposeOverrideFiles: string[];
}>;
export declare function readDockerComposeConfig(params: DockerCLIParameters, composeFiles: string[], envFile: string | undefined): Promise<any>;
export declare function findComposeContainer(params: DockerCLIParameters | DockerResolverParameters, projectName: string, serviceName: string): Promise<string | undefined>;
export declare function getProjectName(params: DockerCLIParameters | DockerResolverParameters, workspace: Workspace, composeFiles: string[]): Promise<string>;
export declare function dockerComposeCLIConfig(params: Omit<PartialExecParameters, 'cmd'>, dockerCLICmd: string, dockerComposeCLICmd: string): () => Promise<DockerComposeCLI>;
