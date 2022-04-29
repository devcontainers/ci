import { DevContainerConfig } from '../spec-configuration/configuration';
import { ImageDetails } from '../spec-shutdown/dockerUtils';
import { FeaturesConfig } from '../spec-configuration/containerFeaturesConfiguration';
import { DockerResolverParameters } from './utils';
export declare function extendImage(params: DockerResolverParameters, config: DevContainerConfig, imageName: string, pullImageOnError: boolean, runArgsUser: string | undefined): Promise<{
    updatedImageName: string;
    collapsedFeaturesConfig: import("../spec-configuration/containerFeaturesConfiguration").CollapsedFeaturesConfig | undefined;
    imageDetails: () => Promise<ImageDetails>;
}>;
export declare function generateContainerEnvs(featuresConfig: FeaturesConfig): string;
