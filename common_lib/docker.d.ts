import { ExecFunction } from './exec';
export declare function isDockerBuildXInstalled(exec: ExecFunction): Promise<boolean>;
export declare function buildImage(exec: ExecFunction, imageName: string, checkoutPath: string, subFolder: string): Promise<void>;
export declare function runContainer(exec: ExecFunction, imageName: string, checkoutPath: string, subFolder: string, command: string, envs?: string[], mounts?: string[]): Promise<void>;
export declare function pushImage(exec: ExecFunction, imageName: string): Promise<void>;
