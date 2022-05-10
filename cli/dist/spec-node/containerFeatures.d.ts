import { DevContainerConfig } from '../spec-configuration/configuration';
import { ImageDetails } from '../spec-shutdown/dockerUtils';
import { FeaturesConfig } from '../spec-configuration/containerFeaturesConfiguration';
import { DockerResolverParameters } from './utils';
export declare function extendImage(params: DockerResolverParameters, config: DevContainerConfig, imageName: string, pullImageOnError: boolean): Promise<{
    updatedImageName: string;
    collapsedFeaturesConfig: undefined;
    imageDetails: () => Promise<ImageDetails>;
} | {
    updatedImageName: string;
    collapsedFeaturesConfig: import("../spec-configuration/containerFeaturesConfiguration").CollapsedFeaturesConfig;
    imageDetails: () => Promise<ImageDetails>;
}>;
export declare function getExtendImageBuildInfo(params: DockerResolverParameters, config: DevContainerConfig, baseName: string, imageUser: string, imageLabelDetails: () => Promise<{
    definition: string | undefined;
    version: string | undefined;
}>): Promise<{
    featureBuildInfo: {
        dstFolder: string;
        dockerfileContent: string;
        dockerfilePrefixContent: string;
        buildArgs: Record<string, string>;
        buildKitContexts: Record<string, string>;
    };
    collapsedFeaturesConfig: import("../spec-configuration/containerFeaturesConfiguration").CollapsedFeaturesConfig;
} | null>;
export declare function generateContainerEnvs(featuresConfig: FeaturesConfig): string;
export declare function updateRemoteUserUID(params: DockerResolverParameters, config: DevContainerConfig, imageName: string, imageDetails: () => Promise<ImageDetails>, runArgsUser: string | undefined): Promise<string>;
