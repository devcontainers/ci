import * as task from 'azure-pipelines-task-lib/task'
import {ExecOptions, ExecResult} from '../../../common/src/exec'
import * as stream from 'stream'

// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md

/* global BufferEncoding */

class TeeStream extends stream.Writable {
	private value = ''
	private teeStream: stream.Writable

	constructor(teeStream: stream.Writable, options?: stream.WritableOptions) {
		super(options)
		this.teeStream = teeStream
	}

	_write(data: any, encoding: BufferEncoding, callback: Function): void {
		this.value += data
		this.teeStream.write(data, encoding) // NOTE - currently ignoring teeStream callback

		if (callback) {
			callback()
		}
	}

	toString(): string {
		return this.value
	}
}

export async function exec(
	command: string,
	args: string[],
	options: ExecOptions
): Promise<ExecResult> {
	const outStream = new TeeStream(process.stdout)
	const errStream = new TeeStream(process.stderr)

	const exitCode = await task.exec(command, args, {
		failOnStdErr: false,
		silent: options.silent ?? false,
		ignoreReturnCode: true
	})

	return {
		exitCode,
		stdout: outStream.toString(),
		stderr: errStream.toString()
	}
}
