import * as actions_exec from '@actions/exec';
import {ExecOptions, ExecResult} from 'devcontainer-build-run-common/src/exec';

export async function exec(
	command: string,
	args: string[],
	options: ExecOptions,
): Promise<ExecResult> {
	const actionOptions: actions_exec.ExecOptions = {
		ignoreReturnCode: true,
		silent: options.silent ?? false,
	};
	const result = await actions_exec.getExecOutput(command, args, actionOptions);

	return {
		exitCode: result.exitCode,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}
