import { ProvisionOptions } from './devContainers';
import { UnpackPromise } from '../spec-utils/types';
declare function doProvision(options: ProvisionOptions): Promise<{
    containerId: string;
    composeProjectName: string | undefined;
    remoteUser: string;
    remoteWorkspaceFolder: string | undefined;
    finishBackgroundTasks: () => Promise<void>;
    outcome: "success";
    dispose: () => Promise<void>;
    message?: undefined;
    description?: undefined;
} | {
    outcome: "error";
    message: string;
    description: string;
    containerId: string | undefined;
    dispose: () => Promise<void>;
}>;
export declare type Result = UnpackPromise<ReturnType<typeof doProvision>> & {
    backgroundProcessPID?: number;
};
export {};
