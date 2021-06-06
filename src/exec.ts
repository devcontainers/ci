import * as actions_exec from '@actions/exec'

export interface ExecResponse {
    exitCode: number
    stdout: string
    stderr: string
}
interface ExecOptions {
    silent: boolean
}
export function exec(command: string, ...args: string[]): Promise<ExecResponse> {
    return execWithOptions(command, {
        silent: true
    }, ...args)
}
export async function execWithOptions(command: string, options: ExecOptions, ...args: string[]): Promise<ExecResponse> {
    let stdout = ''
    let stderr = ''

    const actionOptions: actions_exec.ExecOptions = {
        ignoreReturnCode: true,
        silent: options.silent,
        listeners: {
            stdout: (data: Buffer) => {
                stdout += data.toString()
            },
            stderr: (data: Buffer) => {
                stderr += data.toString()
            }
        }
    }
    const exitCode = await actions_exec.exec(command, args, actionOptions)

    return {
        exitCode,
        stdout,
        stderr
    }
}
