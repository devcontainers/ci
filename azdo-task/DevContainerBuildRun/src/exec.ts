import * as task from 'azure-pipelines-task-lib/task'

export async function exec(command: string, args: string[]): Promise<number> {
	const exitCode = await task.exec(command, args, {
		failOnStdErr: false,
		silent: false,
		ignoreReturnCode: true
	})

	return exitCode
}
export async function execSilent(command: string, args: string[]): Promise<number> {
	const exitCode = await task.exec(command, args, {
		failOnStdErr: false,
		silent: true,
		ignoreReturnCode: true
	})

	return exitCode
}
