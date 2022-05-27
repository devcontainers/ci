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
}
export interface DevContainerCliBuildArgs {
    workspaceFolder: string;
    imageName?: string;
    additionalCacheFroms?: string[];
}
declare function devContainerBuild(args: DevContainerCliBuildArgs, log: (data: string) => void): Promise<DevContainerCliBuildResult | DevContainerCliError>;
export interface DevContainerCliUpResult extends DevContainerCliSuccessResult {
    containerId: string;
    remoteUser: string;
    remoteWorkspaceFolder: string;
}
export interface DevContainerCliUpArgs {
    workspaceFolder: string;
    additionalCacheFroms?: string[];
    skipContainerUserIdUpdate?: boolean;
}
declare function devContainerUp(args: DevContainerCliUpArgs, log: (data: string) => void): Promise<DevContainerCliUpResult | DevContainerCliError>;
export interface DevContainerCliExecResult extends DevContainerCliSuccessResult {
}
export interface DevContainerCliExecArgs {
    workspaceFolder: string;
    command: string[];
    env?: string[];
}
declare function devContainerExec(args: DevContainerCliExecArgs, log: (data: string) => void): Promise<DevContainerCliExecResult | DevContainerCliError>;
export declare const devcontainer: {
    build: typeof devContainerBuild;
    up: typeof devContainerUp;
    exec: typeof devContainerExec;
    isCliInstalled: typeof isCliInstalled;
    installCli: typeof installCli;
};
export {};
