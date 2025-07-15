import { ExecFunction } from './exec';
export declare function isDockerBuildXInstalled(exec: ExecFunction): Promise<boolean>;
export declare function buildImage(exec: ExecFunction, imageName: string, imageTag: string | undefined, checkoutPath: string, subFolder: string, skipContainerUserIdUpdate: boolean, cacheFrom: string[], cacheTo: string[]): Promise<string>;
export declare function runContainer(exec: ExecFunction, imageName: string, imageTag: string | undefined, checkoutPath: string, subFolder: string, command: string, envs?: string[], mounts?: string[]): Promise<void>;
export declare function pushImage(exec: ExecFunction, imageName: string, imageTag: string | undefined): Promise<void>;
export interface DockerMount {
    type: string;
    source: string;
    target: string;
}
export declare function parseMount(mountString: string): DockerMount;
