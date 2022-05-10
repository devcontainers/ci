/// <reference types="node" />
import { CLIHost, ExecFunction, Exec, PtyExecFunction } from '../spec-common/commonUtils';
import { Log } from '../spec-utils/log';
import { Event } from '../spec-utils/event';
export interface ContainerDetails {
    Id: string;
    Created: string;
    Name: string;
    State: {
        Status: string;
        StartedAt: string;
        FinishedAt: string;
    };
    Config: {
        Image: string;
        User: string;
        Env: string[] | null;
        Labels: Record<string, string | undefined> | null;
    };
    Mounts: {
        Type: string;
        Name?: string;
        Source: string;
        Destination: string;
    }[];
    NetworkSettings: {
        Ports: Record<string, {
            HostIp: string;
            HostPort: string;
        }[] | null>;
    };
    Ports: {
        IP: string;
        PrivatePort: number;
        PublicPort: number;
        Type: string;
    }[];
}
export interface DockerCLIParameters {
    cliHost: CLIHost;
    dockerCLI: string;
    dockerComposeCLI: () => Promise<DockerComposeCLI>;
    env: NodeJS.ProcessEnv;
    output: Log;
}
export interface PartialExecParameters {
    exec: ExecFunction;
    cmd: string;
    args?: string[];
    env: NodeJS.ProcessEnv;
    output: Log;
    print?: boolean | 'continuous';
}
export interface PartialPtyExecParameters {
    ptyExec: PtyExecFunction;
    cmd: string;
    args?: string[];
    env: NodeJS.ProcessEnv;
    output: Log;
    onDidInput?: Event<string>;
}
interface DockerResolverParameters {
    dockerCLI: string;
    dockerComposeCLI: () => Promise<DockerComposeCLI>;
    dockerEnv: NodeJS.ProcessEnv;
    common: {
        cliHost: CLIHost;
        output: Log;
    };
}
export interface DockerComposeCLI {
    version: string;
    cmd: string;
    args: string[];
}
export declare function inspectContainer(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, id: string): Promise<ContainerDetails>;
export declare function inspectContainers(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, ids: string[]): Promise<ContainerDetails[]>;
export interface ImageDetails {
    Id: string;
    Config: {
        User: string;
        Env: string[] | null;
        Labels: Record<string, string | undefined> | null;
        Entrypoint: string[] | null;
        Cmd: string[] | null;
    };
}
export declare function inspectImage(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, id: string): Promise<ImageDetails>;
export interface VolumeDetails {
    Name: string;
    CreatedAt: string;
    Labels: Record<string, string> | null;
}
export declare function inspectVolume(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, name: string): Promise<VolumeDetails>;
export declare function inspectVolumes(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, names: string[]): Promise<VolumeDetails[]>;
export declare function listContainers(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, all?: boolean, labels?: string[]): Promise<string[]>;
export declare function listVolumes(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, labels?: string[]): Promise<string[]>;
export declare function createVolume(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, name: string, labels: string[]): Promise<void>;
export declare function getEvents(params: DockerCLIParameters | DockerResolverParameters, filters?: Record<string, string[]>): Promise<Exec>;
export declare function dockerHasBuildKit(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters): Promise<boolean>;
export declare function dockerCLI(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, ...args: string[]): Promise<{
    stdout: Buffer;
    stderr: Buffer;
}>;
export declare function dockerContext(params: DockerCLIParameters): Promise<string | undefined>;
export declare function isPodman(params: DockerCLIParameters | DockerResolverParameters): Promise<boolean>;
export declare function dockerPtyCLI(params: PartialPtyExecParameters | DockerResolverParameters, ...args: string[]): Promise<{
    cmdOutput: string;
}>;
export declare function dockerComposeCLI(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, ...args: string[]): Promise<{
    stdout: Buffer;
    stderr: Buffer;
}>;
export declare function dockerComposePtyCLI(params: DockerCLIParameters | PartialPtyExecParameters | DockerResolverParameters, ...args: string[]): Promise<{
    cmdOutput: string;
}>;
export declare function dockerExecFunction(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, containerName: string, user: string | undefined): ExecFunction;
export declare function dockerPtyExecFunction(params: PartialPtyExecParameters | DockerResolverParameters, containerName: string, user: string | undefined, loadNativeModule: <T>(moduleName: string) => Promise<T | undefined>): Promise<PtyExecFunction>;
export declare function toExecParameters(params: DockerCLIParameters | PartialExecParameters | DockerResolverParameters, compose?: DockerComposeCLI): PartialExecParameters;
export declare function toPtyExecParameters(params: DockerCLIParameters | PartialPtyExecParameters | DockerResolverParameters, compose?: DockerComposeCLI): PartialPtyExecParameters;
export declare function toDockerImageName(name: string): string;
export {};
