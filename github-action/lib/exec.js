import * as actions_exec from '@actions/exec';
export async function exec(command, args, options) {
    const actionOptions = {
        ignoreReturnCode: true,
        silent: options.silent ?? false
    };
    const result = await actions_exec.getExecOutput(command, args, actionOptions);
    return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
    };
}
