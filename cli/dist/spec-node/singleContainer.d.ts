import { ResolverResult, DockerResolverParameters, WorkspaceConfiguration } from './utils';
import { ContainerDetails, DockerCLIParameters, ImageDetails } from '../spec-shutdown/dockerUtils';
import { DevContainerFromDockerfileConfig, DevContainerFromImageConfig } from '../spec-configuration/configuration';
import { Log } from '../spec-utils/log';
import { CollapsedFeaturesConfig } from '../spec-configuration/containerFeaturesConfiguration';
export declare const hostFolderLabel = "devcontainer.local_folder";
export declare function openDockerfileDevContainer(params: DockerResolverParameters, config: DevContainerFromDockerfileConfig | DevContainerFromImageConfig, workspaceConfig: WorkspaceConfiguration, idLabels: string[]): Promise<ResolverResult>;
export declare function buildNamedImageAndExtend(params: DockerResolverParameters, config: DevContainerFromDockerfileConfig | DevContainerFromImageConfig): Promise<{
    updatedImageName: string;
    collapsedFeaturesConfig: CollapsedFeaturesConfig | undefined;
    imageDetails: () => Promise<ImageDetails>;
}>;
export declare function findUserArg(runArgs?: string[]): string | undefined;
export declare function findExistingContainer(params: DockerResolverParameters, labels: string[]): Promise<ContainerDetails | undefined>;
export declare function findDevContainer(params: DockerCLIParameters | DockerResolverParameters, labels: string[]): Promise<ContainerDetails | undefined>;
export declare function spawnDevContainer(params: DockerResolverParameters, config: DevContainerFromDockerfileConfig | DevContainerFromImageConfig, collapsedFeaturesConfig: CollapsedFeaturesConfig | undefined, imageName: string, labels: string[], workspaceMount: string | undefined, imageDetails: (() => Promise<ImageDetails>) | undefined): Promise<void>;
export declare function bailOut(output: Log, message: string): never;
