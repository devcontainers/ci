export interface PackageConfiguration {
    name: string;
    publisher?: string;
    version: string;
    aiKey?: string;
}
export declare function getPackageConfig(packageFolder: string): Promise<PackageConfiguration>;
export declare const includeAllConfiguredFeatures = true;
