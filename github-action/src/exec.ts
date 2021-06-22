import * as actions_exec from '@actions/exec'

export async function exec(
	command: string,
	args: string[]
): Promise<number> {

	const actionOptions: actions_exec.ExecOptions = {
		ignoreReturnCode: true,
		silent: false
	}
	const exitCode = await actions_exec.exec(command, args, actionOptions)

	return exitCode;
}

export async function execSilent(
	command: string,
	args: string[]
): Promise<number> {

	const actionOptions: actions_exec.ExecOptions = {
		ignoreReturnCode: true,
		silent: true
	}
	const exitCode = await actions_exec.exec(command, args, actionOptions)

	return exitCode;
}
