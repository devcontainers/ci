import * as task from 'azure-pipelines-task-lib/task'

export async function exec(command: string, args: string[]): Promise<number> {
	const exitCode = await task.exec(command, args, {
		failOnStdErr: false,
		silent: false, // TODO add execSilent for BuildX install check
		ignoreReturnCode: true
	})

	return exitCode
}
