/// <reference types="node" />
import * as path from 'path';
import { ExecFunction, Exec, PlatformSwitch } from './commonUtils';
import { Log, LogLevel } from '../spec-utils/log';
export interface ShellServer {
    exec(cmd: PlatformSwitch<string>, options?: {
        logLevel?: LogLevel;
        logOutput?: boolean | 'continuous' | 'silent';
        stdin?: Buffer;
    }): Promise<{
        stdout: string;
        stderr: string;
    }>;
    process: Exec;
    platform: NodeJS.Platform;
    path: typeof path.posix | typeof path.win32;
}
export declare const EOT = "\u2404";
export declare function launch(remoteExec: ExecFunction | Exec, output: Log, agentSessionId?: string, platform?: NodeJS.Platform, hostName?: 'Host' | 'Container'): Promise<ShellServer>;
