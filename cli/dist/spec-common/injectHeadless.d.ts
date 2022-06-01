/// <reference types="node" />
import * as fs from 'fs';
import { ShellServer } from './shellServer';
import { ExecFunction, CLIHost, PtyExecFunction } from './commonUtils';
import { Event } from '../spec-utils/event';
import { PackageConfiguration } from '../spec-utils/product';
import { URI } from 'vscode-uri';
import { Log, LogLevel } from '../spec-utils/log';
export declare enum ResolverProgress {
    Begin = 0,
    CloningRepository = 1,
    BuildingImage = 2,
    StartingContainer = 3,
    InstallingServer = 4,
    StartingServer = 5,
    End = 6
}
export interface ResolverParameters {
    prebuild?: boolean;
    computeExtensionHostEnv: boolean;
    package: PackageConfiguration;
    containerDataFolder: string | undefined;
    containerSystemDataFolder: string | undefined;
    appRoot: string | undefined;
    extensionPath: string;
    sessionId: string;
    sessionStart: Date;
    cliHost: CLIHost;
    env: NodeJS.ProcessEnv;
    cwd: string;
    isLocalContainer: boolean;
    progress: (current: ResolverProgress) => void;
    output: Log;
    allowSystemConfigChange: boolean;
    defaultUserEnvProbe: UserEnvProbe;
    postCreate: PostCreate;
    getLogLevel: () => LogLevel;
    onDidChangeLogLevel: Event<LogLevel>;
    loadNativeModule: <T>(moduleName: string) => Promise<T | undefined>;
    shutdowns: (() => Promise<void>)[];
    backgroundTasks: (Promise<void> | (() => Promise<void>))[];
    persistedFolder: string;
    remoteEnv: Record<string, string>;
}
export interface PostCreate {
    enabled: boolean;
    skipNonBlocking: boolean;
    output: Log;
    onDidInput: Event<string>;
    done: () => void;
}
export declare function createNullPostCreate(enabled: boolean, skipNonBlocking: boolean, output: Log): PostCreate;
export interface PortAttributes {
    label: string | undefined;
    onAutoForward: string | undefined;
    elevateIfNeeded: boolean | undefined;
}
export declare type UserEnvProbe = 'none' | 'loginInteractiveShell' | 'interactiveShell' | 'loginShell';
export declare type DevContainerConfigCommand = 'initializeCommand' | 'onCreateCommand' | 'updateContentCommand' | 'postCreateCommand' | 'postStartCommand' | 'postAttachCommand';
export interface CommonDevContainerConfig {
    configFilePath?: URI;
    remoteEnv?: Record<string, string | null>;
    forwardPorts?: (number | string)[];
    portsAttributes?: Record<string, PortAttributes>;
    otherPortsAttributes?: PortAttributes;
    features?: Record<string, string | boolean | Record<string, string | boolean>>;
    onCreateCommand?: string | string[];
    updateContentCommand?: string | string[];
    postCreateCommand?: string | string[];
    postStartCommand?: string | string[];
    postAttachCommand?: string | string[];
    waitFor?: DevContainerConfigCommand;
    userEnvProbe?: UserEnvProbe;
}
export interface OSRelease {
    hardware: string;
    id: string;
    version: string;
}
export interface ContainerProperties {
    createdAt: string | undefined;
    startedAt: string | undefined;
    osRelease: OSRelease;
    user: string;
    gid: string | undefined;
    env: NodeJS.ProcessEnv;
    shell: string;
    homeFolder: string;
    userDataFolder: string;
    remoteWorkspaceFolder?: string;
    remoteExec: ExecFunction;
    remotePtyExec: PtyExecFunction;
    remoteExecAsRoot?: ExecFunction;
    shellServer: ShellServer;
    launchRootShellServer?: () => Promise<ShellServer>;
}
export declare function getContainerProperties(options: {
    params: ResolverParameters;
    createdAt: string | undefined;
    startedAt: string | undefined;
    remoteWorkspaceFolder: string | undefined;
    containerUser: string | undefined;
    containerGroup: string | undefined;
    containerEnv: NodeJS.ProcessEnv | undefined;
    remoteExec: ExecFunction;
    remotePtyExec: PtyExecFunction;
    remoteExecAsRoot: ExecFunction | undefined;
    rootShellServer: ShellServer | undefined;
}): Promise<ContainerProperties>;
export declare function getUser(shellServer: ShellServer): Promise<string>;
export declare function getHomeFolder(containerEnv: NodeJS.ProcessEnv, passwdUser: PasswdUser | undefined): Promise<string>;
export declare function getUserFromEtcPasswd(shellServer: ShellServer, userNameOrId: string): Promise<PasswdUser | undefined>;
export interface PasswdUser {
    name: string;
    uid: string;
    gid: string;
    home: string;
    shell: string;
}
export declare function findUserInEtcPasswd(etcPasswd: string, nameOrId: string): PasswdUser | undefined;
export declare function getUserDataFolder(homeFolder: string, params: ResolverParameters): string;
export declare function getSystemVarFolder(params: ResolverParameters): string;
export declare function setupInContainer(params: ResolverParameters, containerProperties: ContainerProperties, config: CommonDevContainerConfig): Promise<{
    remoteEnv: Record<string, string>;
}>;
export declare function probeRemoteEnv(params: ResolverParameters, containerProperties: ContainerProperties, config: CommonDevContainerConfig): Promise<Record<string, string>>;
export declare function runPostCreateCommands(params: ResolverParameters, containerProperties: ContainerProperties, config: CommonDevContainerConfig, remoteEnv: Promise<Record<string, string>>, stopForPersonalization: boolean): Promise<'skipNonBlocking' | 'prebuild' | 'stopForPersonalization' | 'done'>;
export declare function getOSRelease(shellServer: ShellServer): Promise<{
    hardware: string;
    id: string;
    version: string;
}>;
export declare function runRemoteCommand(params: {
    output: Log;
    onDidInput?: Event<string>;
}, { remotePtyExec }: {
    remotePtyExec: PtyExecFunction;
}, cmd: string[], cwd?: string, options?: {
    remoteEnv?: NodeJS.ProcessEnv;
    stdin?: Buffer | fs.ReadStream;
    silent?: boolean;
    print?: 'off' | 'continuous' | 'end';
    resolveOn?: RegExp;
}): Promise<{
    cmdOutput: string;
}>;
export declare function finishBackgroundTasks(tasks: (Promise<void> | (() => Promise<void>))[]): Promise<void>;
