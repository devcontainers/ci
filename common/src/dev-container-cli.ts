import {spawn as spawnRaw} from 'child_process';
import fs, {fstatSync} from 'fs';
import path from 'path';
import {env} from 'process';
import {promisify} from 'util';
import {ExecFunction} from './exec';
export interface DevContainerCliError {
	outcome: 'error';
	code: number;
	message: string;
	description: string;
}
function getSpecCliInfo() {
	// // TODO - this is temporary until the CLI is installed via npm
	// // TODO - ^ could consider an `npm install` from the folder
	// const specCLIPath = path.resolve(__dirname, "..", "cli", "cli.js");
	// return {
	//   command: `node ${specCLIPath}`,
	// };
	return {
		command: 'devcontainer',
	};
}

async function isCliInstalled(exec: ExecFunction): Promise<boolean> {
	try {
		const {exitCode} = await exec(getSpecCliInfo().command, ['--help'], {
			silent: true,
		});
		return exitCode === 0;
	} catch (error) {
		return false;
	}
}
const fstat = promisify(fs.stat);
async function installCli(exec: ExecFunction): Promise<boolean> {
	// if we have a local 'cli' folder, then use that as we're testing a private cli build
	const localCLIPath = path.resolve(__dirname, "..", "..", "cli");

	let cliStat = null;
	try {
		console.log(`Checking ${localCLIPath}...`)
		cliStat = await fstat(localCLIPath);
	} catch {}
	if (cliStat && cliStat.isDirectory()) {
		const {exitCode} = await exec(
			'bash',
			['-c', `cd  ${localCLIPath} && npm install && npm install -g`],
			{},
		);
		return exitCode === 0;
	}
	const {exitCode} = await exec(
		'bash',
		['-c', 'npm install -g @devcontainers/cli'],
		{},
	);
	return exitCode === 0;
}

interface SpawnResult {
	code: number | null;
}

interface SpawnOptions {
	log: (data: string) => void;
	err: (data: string) => void;
	env: NodeJS.ProcessEnv;
}
function spawn(
	command: string,
	args: string[],
	options: SpawnOptions,
): Promise<SpawnResult> {
	return new Promise<SpawnResult>((resolve, reject) => {
		const proc = spawnRaw(command, args, {env: process.env});

		// const env = params.env ? { ...process.env, ...params.env } : process.env;

		proc.stdout.on('data', data => options.log(data.toString()));
		proc.stderr.on('data', data => options.err(data.toString()));

		proc.on('error', err => {
			reject(err);
		});
		proc.on('close', code => {
			resolve({
				code: code,
			});
		});
	});
}

function parseCliOutput<T>(value: string): T | DevContainerCliError {
	if (value === '') {
		// TODO - revisit this
		throw new Error('Unexpected empty output from CLI');
	}
	try {
		return JSON.parse(value) as T;
	} catch (error) {
		return {
			code: -1,
			outcome: 'error' as 'error',
			message: 'Failed to parse CLI output',
			description: `Failed to parse CLI output as JSON: ${value}\nError: ${error}`,
		};
	}
}

async function runSpecCli<T>(options: {
	args: string[];
	log: (data: string) => void;
	env?: NodeJS.ProcessEnv;
}) {
	let stdout = '';
	const spawnOptions: SpawnOptions = {
		log: data => (stdout += data),
		err: data => options.log(data),
		env: options.env ? {...process.env, ...options.env} : process.env,
	};
	const command = getSpecCliInfo().command;
	console.log(`About to run ${command} ${options.args.join(' ')}`); // TODO - take an output arg to allow GH to use core.info
	await spawn(command, options.args, spawnOptions);

	return parseCliOutput<T>(stdout);
}

export interface DevContainerCliSuccessResult {
	outcome: 'success';
}

export interface DevContainerCliBuildResult
	extends DevContainerCliSuccessResult {}
export interface DevContainerCliBuildArgs {
	workspaceFolder: string;
	imageName?: string;
	additionalCacheFroms?: string[];
}
async function devContainerBuild(
	args: DevContainerCliBuildArgs,
	log: (data: string) => void,
): Promise<DevContainerCliBuildResult | DevContainerCliError> {
	const commandArgs: string[] = [
		'build',
		'--workspace-folder',
		args.workspaceFolder,
	];
	if (args.imageName) {
		commandArgs.push('--image-name', args.imageName);
	}
	if (args.additionalCacheFroms) {
		args.additionalCacheFroms.forEach(cacheFrom =>
			commandArgs.push('--cache-from', cacheFrom),
		);
	}
	return await runSpecCli<DevContainerCliBuildResult>({
		args: commandArgs,
		log,
		env: {DOCKER_BUILDKIT: '1'},
	});
}

export interface DevContainerCliUpResult extends DevContainerCliSuccessResult {
	containerId: string;
	remoteUser: string;
	remoteWorkspaceFolder: string;
}
export interface DevContainerCliUpArgs {
	workspaceFolder: string;
	additionalCacheFroms?: string[];
	skipContainerUserIdUpdate?: boolean;
}
async function devContainerUp(
	args: DevContainerCliUpArgs,
	log: (data: string) => void,
): Promise<DevContainerCliUpResult | DevContainerCliError> {
	const commandArgs: string[] = [
		'up',
		'--workspace-folder',
		args.workspaceFolder,
	];
	if (args.additionalCacheFroms) {
		args.additionalCacheFroms.forEach(cacheFrom =>
			commandArgs.push('--cache-from', cacheFrom),
		);
	}
	if (args.skipContainerUserIdUpdate) {
		commandArgs.push('--update-remote-user-uid-default', 'off');
	}
	return await runSpecCli<DevContainerCliUpResult>({
		args: commandArgs,
		log,
		env: {DOCKER_BUILDKIT: '1'},
	});
}

export interface DevContainerCliExecResult
	extends DevContainerCliSuccessResult {}
export interface DevContainerCliExecArgs {
	workspaceFolder: string;
	command: string[];
	env?: string[];
}
async function devContainerExec(
	args: DevContainerCliExecArgs,
	log: (data: string) => void,
): Promise<DevContainerCliExecResult | DevContainerCliError> {
	// const remoteEnvArgs = args.env ? args.env.flatMap(e=> ["--remote-env", e]): []; // TODO - test flatMap again
	const remoteEnvArgs = getRemoteEnvArray(args.env);
	return await runSpecCli<DevContainerCliExecResult>({
		args: [
			'exec',
			'--workspace-folder',
			args.workspaceFolder,
			...remoteEnvArgs,
			...args.command,
		],
		log,
		env: {DOCKER_BUILDKIT: '1'},
	});
}

function getRemoteEnvArray(env?: string[]): string[] {
	if (!env) {
		return [];
	}
	let result = [];
	for (let i = 0; i < env.length; i++) {
		const envItem = env[i];
		result.push('--remote-env', envItem);
	}
	return result;
}

export const devcontainer = {
	build: devContainerBuild,
	up: devContainerUp,
	exec: devContainerExec,
	isCliInstalled,
	installCli,
};
