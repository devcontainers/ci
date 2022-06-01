/// <reference types="node" />
import { DevContainerConfig } from './configuration';
import { Log } from '../spec-utils/log';
export interface Feature {
    id: string;
    name: string;
    documentationURL?: string;
    options?: Record<string, FeatureOption>;
    buildArg?: string;
    containerEnv?: Record<string, string>;
    mounts?: Mount[];
    init?: boolean;
    privileged?: boolean;
    capAdd?: string[];
    securityOpt?: string[];
    entrypoint?: string;
    include?: string[];
    exclude?: string[];
    value: boolean | string | Record<string, boolean | string | undefined>;
    included: boolean;
}
export declare type FeatureOption = {
    type: 'boolean';
    default?: boolean;
    description?: string;
} | {
    type: 'string';
    enum?: string[];
    default?: string;
    description?: string;
} | {
    type: 'string';
    proposals?: string[];
    default?: string;
    description?: string;
};
export interface Mount {
    type: 'bind' | 'volume';
    source: string;
    target: string;
    external?: boolean;
}
export declare type SourceInformation = LocalCacheSourceInformation | GithubSourceInformation | DirectTarballSourceInformation | FilePathSourceInformation;
interface BaseSourceInformation {
    type: string;
}
export interface LocalCacheSourceInformation extends BaseSourceInformation {
    type: 'local-cache';
}
export interface GithubSourceInformation extends BaseSourceInformation {
    type: 'github-repo';
    apiUri: string;
    unauthenticatedUri: string;
    owner: string;
    repo: string;
    isLatest: boolean;
    tag?: string;
    ref?: string;
    sha?: string;
}
export interface GithubSourceInformationInput {
    owner: string;
    repo: string;
    ref?: string;
    sha?: string;
    tag?: string;
}
export interface DirectTarballSourceInformation extends BaseSourceInformation {
    type: 'direct-tarball';
    tarballUri: string;
}
export interface FilePathSourceInformation extends BaseSourceInformation {
    type: 'file-path';
    filePath: string;
    isRelative: boolean;
}
export interface FeatureSet {
    features: Feature[];
    sourceInformation: SourceInformation;
}
export interface FeaturesConfig {
    featureSets: FeatureSet[];
    dstFolder?: string;
}
export interface GitHubApiReleaseInfo {
    assets: GithubApiReleaseAsset[];
    name: string;
    tag_name: string;
}
export interface GithubApiReleaseAsset {
    url: string;
    name: string;
    content_type: string;
    size: number;
    download_count: number;
    updated_at: string;
}
export interface CollapsedFeaturesConfig {
    allFeatures: Feature[];
}
export declare function collapseFeaturesConfig(original: FeaturesConfig): CollapsedFeaturesConfig;
export declare const multiStageBuildExploration = false;
export declare function getContainerFeaturesFolder(_extensionPath: string | {
    distFolder: string;
}): string;
export declare function getSourceInfoString(srcInfo: SourceInformation): string;
export declare function getContainerFeaturesBaseDockerFile(): string;
export declare function getFeatureLayers(featuresConfig: FeaturesConfig): string;
export declare function parseFeatureIdentifier(input: string, output: Log): {
    id: string;
    sourceInformation: SourceInformation;
} | undefined;
export declare function createGitHubSourceInformation(params: GithubSourceInformationInput): GithubSourceInformation;
export declare function loadFeaturesJson(jsonBuffer: Buffer, output: Log): Promise<FeatureSet | undefined>;
export declare function loadFeaturesJsonFromDisk(pathToDirectory: string, output: Log): Promise<FeatureSet | undefined>;
export declare function generateFeaturesConfig(params: {
    extensionPath: string;
    output: Log;
    env: NodeJS.ProcessEnv;
}, dstFolder: string, config: DevContainerConfig, imageLabelDetails: () => Promise<{
    definition?: string;
    version?: string;
}>, getLocalFolder: (d: string) => string): Promise<FeaturesConfig | undefined>;
export declare function doReadUserDeclaredFeatures(params: {
    output: Log;
}, config: DevContainerConfig, featuresConfig: FeaturesConfig, imageLabelDetails: () => Promise<{
    definition?: string;
    version?: string;
}>): Promise<FeaturesConfig>;
export declare function getFeatureMainProperty(feature: Feature): "version" | undefined;
export declare function getFeatureMainValue(feature: Feature): string | boolean | undefined;
export declare function getFeatureValueObject(feature: Feature): Record<string, string | boolean | undefined>;
export {};
