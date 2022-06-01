import { ContainerProperties, CommonDevContainerConfig, ResolverParameters } from './injectHeadless';
export { toErrorText, toWarningText } from '../spec-utils/log';
export interface ContainerErrorAction {
    readonly id: string;
    readonly title: string;
    readonly isCloseAffordance?: boolean;
    readonly isLastAction: boolean;
    applicable: (err: ContainerError, primary: boolean) => boolean | Promise<boolean>;
    execute: (err: ContainerError) => Promise<void>;
}
interface ContainerErrorData {
    reload?: boolean;
    start?: boolean;
    attach?: boolean;
    fileWithError?: string;
    learnMoreUrl?: string;
}
interface ContainerErrorInfo {
    description: string;
    originalError?: any;
    manageContainer?: boolean;
    params?: ResolverParameters;
    containerId?: string;
    dockerParams?: any;
    containerProperties?: ContainerProperties;
    actions?: ContainerErrorAction[];
    data?: ContainerErrorData;
}
export declare class ContainerError extends Error implements ContainerErrorInfo {
    description: string;
    originalError?: any;
    manageContainer: boolean;
    params?: ResolverParameters;
    containerId?: string;
    dockerParams?: any;
    volumeName?: string;
    repositoryPath?: string;
    folderPath?: string;
    containerProperties?: ContainerProperties;
    config?: CommonDevContainerConfig;
    actions: ContainerErrorAction[];
    data: ContainerErrorData;
    constructor(info: ContainerErrorInfo);
}
