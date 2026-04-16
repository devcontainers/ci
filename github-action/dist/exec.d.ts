export interface ExecResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
export interface ExecOptions {
    silent?: boolean;
}
export type ExecFunction = (command: string, args: string[], options: ExecOptions) => Promise<ExecResult>;
