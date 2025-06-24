import { ExecFunction } from './exec';
export interface DevContainerCliError {
    outcome: 'error';
    code: number;
    message: string;
    description: string;
}
declare function isCliInstalled(exec: ExecFunction): Promise<boolean>;
declare function installCli(exec: ExecFunction): Promise<boolean>;
export interface DevContainerCliSuccessResult {
    outcome: 'success';
}
export interface DevContainerCliBuildResult extends DevContainerCliSuccessResult {
    imageDigests?: Record<string, string>;
}
export interface DevContainerCliBuildArgs {
    workspaceFolder: string;
    configFile: string | undefined;
    imageName?: string[];
    platform?: string;
    additionalCacheFroms?: string[];
    userDataFolder?: string;
    output?: string;
    noCache?: boolean;
    cacheTo?: string[];
}
declare function devContainerBuild(args: DevContainerCliBuildArgs, log: (data: string) => void): Promise<DevContainerCliBuildResult | DevContainerCliError>;
export interface DevContainerCliUpResult extends DevContainerCliSuccessResult {
    containerId: string;
    remoteUser: string;
    remoteWorkspaceFolder: string;
}
export interface DevContainerCliUpArgs {
    workspaceFolder: string;
    configFile: string | undefined;
    additionalCacheFroms?: string[];
    cacheTo?: string[];
    skipContainerUserIdUpdate?: boolean;
    env?: string[];
    userDataFolder?: string;
    additionalMounts?: string[];
}
declare function devContainerUp(args: DevContainerCliUpArgs, log: (data: string) => void): Promise<DevContainerCliUpResult | DevContainerCliError>;
export interface DevContainerCliExecArgs {
    workspaceFolder: string;
    configFile: string | undefined;
    command: string[];
    env?: string[];
    userDataFolder?: string;
}
declare function devContainerExec(args: DevContainerCliExecArgs, log: (data: string) => void): Promise<number | null>;
export declare const devcontainer: {
    build: typeof devContainerBuild;
    up: typeof devContainerUp;
    exec: typeof devContainerExec;
    isCliInstalled: typeof isCliInstalled;
    installCli: typeof installCli;
};
export {};
