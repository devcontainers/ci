import { DockerResolverParameters, UpdateRemoteUserUIDDefault, BindMountConsistency } from './utils';
import { UserEnvProbe } from '../spec-common/injectHeadless';
import { URI } from 'vscode-uri';
import { LogLevel, LogDimensions, Log, LogFormat } from '../spec-utils/log';
import { Mount } from '../spec-configuration/containerFeaturesConfiguration';
import { PackageConfiguration } from '../spec-utils/product';
export interface ProvisionOptions {
    dockerPath: string | undefined;
    dockerComposePath: string | undefined;
    containerDataFolder: string | undefined;
    containerSystemDataFolder: string | undefined;
    workspaceFolder: string | undefined;
    workspaceMountConsistency?: BindMountConsistency;
    mountWorkspaceGitRoot: boolean;
    idLabels: string[];
    configFile: URI | undefined;
    overrideConfigFile: URI | undefined;
    logLevel: LogLevel;
    logFormat: LogFormat;
    log: (text: string) => void;
    terminalDimensions: LogDimensions | undefined;
    defaultUserEnvProbe: UserEnvProbe;
    removeExistingContainer: boolean;
    buildNoCache: boolean;
    expectExistingContainer: boolean;
    postCreateEnabled: boolean;
    skipNonBlocking: boolean;
    prebuild: boolean;
    persistedFolder: string | undefined;
    additionalMounts: Mount[];
    updateRemoteUserUIDDefault: UpdateRemoteUserUIDDefault;
    remoteEnv: Record<string, string>;
}
export declare function launch(options: ProvisionOptions, disposables: (() => Promise<unknown> | undefined)[]): Promise<{
    containerId: string;
    remoteUser: string;
    remoteWorkspaceFolder: string | undefined;
    finishBackgroundTasks: () => Promise<void>;
}>;
export declare function createDockerParams(options: ProvisionOptions, disposables: (() => Promise<unknown> | undefined)[]): Promise<DockerResolverParameters>;
export interface LogOptions {
    logLevel: LogLevel;
    logFormat: LogFormat;
    log: (text: string) => void;
    terminalDimensions: LogDimensions | undefined;
}
export declare function createLog(options: LogOptions, pkg: PackageConfiguration, sessionStart: Date, disposables: (() => Promise<unknown> | undefined)[]): Log & {
    join(): Promise<void>;
};
