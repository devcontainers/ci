import * as task from 'azure-pipelines-task-lib/task';
import {ExecOptions, ExecResult} from '../../../common/src/exec';
import * as stream from 'stream';

// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md

/* global BufferEncoding */

class TeeStream extends stream.Writable {
	private value = '';
	private teeStream: stream.Writable;

	constructor(teeStream: stream.Writable, options?: stream.WritableOptions) {
		super(options);
		this.teeStream = teeStream;
	}

	_write(data: any, encoding: BufferEncoding, callback: Function): void {
		this.value += data;
		this.teeStream.write(data, encoding); // NOTE - currently ignoring teeStream callback

		if (callback) {
			callback();
		}
	}

	toString(): string {
		return this.value;
	}
}
class NullStream extends stream.Writable {
	_write(data: any, encoding: BufferEncoding, callback: Function): void {
		if (callback) {
			callback();
		}
	}
}
function trimCommand(input: string): string {
	if (input.startsWith('[command]')) {
		const newLine = input.indexOf('\n');
		return input.substring(newLine + 1);
	}
	return input;
}
export async function exec(
	command: string,
	args: string[],
	options: ExecOptions,
): Promise<ExecResult> {
	const outStream = new TeeStream(
		options.silent ? new NullStream() : process.stdout,
	);
	const errStream = new TeeStream(
		options.silent ? new NullStream() : process.stderr,
	);

	const exitCode = await task.exec(command, args, {
		failOnStdErr: false,
		silent: false, // always run non-silent - we just don't output to process.stdout/stderr with the TeeStreams above
		ignoreReturnCode: true,
		outStream,
		errStream,
	});

	return {
		exitCode,
		stdout: trimCommand(outStream.toString()),
		stderr: errStream.toString(),
	};
}
