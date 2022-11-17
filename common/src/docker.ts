import path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as config from './config';
import {ExecFunction} from './exec';
import {getAbsolutePath} from './file';
import {substituteValues} from './envvars';
import {parseGroup, parsePasswd} from './users';

export async function isDockerBuildXInstalled(
	exec: ExecFunction,
): Promise<boolean> {
	const {exitCode} = await exec('docker', ['buildx', '--help'], {silent: true});
	return exitCode === 0;
}
export async function buildImage(
	exec: ExecFunction,
	imageName: string,
	imageTag: string | undefined,
	checkoutPath: string,
	subFolder: string,
	skipContainerUserIdUpdate: boolean,
	cacheFrom: string[],
): Promise<string> {
	const folder = path.join(checkoutPath, subFolder);
	const devcontainerJsonPath = path.join(
		folder,
		'.devcontainer/devcontainer.json',
	);
	const devcontainerConfig = await config.loadFromFile(devcontainerJsonPath);

	// build the image from the .devcontainer spec
	await buildImageBase(
		exec,
		imageName,
		imageTag,
		folder,
		devcontainerConfig,
		cacheFrom,
	);

	if (!devcontainerConfig.remoteUser || skipContainerUserIdUpdate == true) {
		return imageName;
	}
	return await ensureHostAndContainerUsersAlign(
		exec,
		imageName,
		imageTag,
		devcontainerConfig,
	);
}

function coerceToArray(value: string | string[]): string[] {
	return typeof value === 'string' ? [value] : value;
}

async function buildImageBase(
	exec: ExecFunction,
	imageName: string,
	imageTag: string | undefined,
	folder: string,
	devcontainerConfig: config.DevContainerConfig,
	cacheFrom: string[],
): Promise<void> {
	const configDockerfile = config.getDockerfile(devcontainerConfig);
	if (!configDockerfile) {
		throw new Error(
			'dockerfile not set in devcontainer.json - devcontainer-build-run currently only supports Dockerfile-based dev containers',
		);
	}
	const dockerfilePath = path.join(folder, '.devcontainer', configDockerfile);

	const configContext = config.getContext(devcontainerConfig) ?? '';
	const contextPath = path.join(folder, '.devcontainer', configContext);

	const args = ['buildx', 'build'];
	imageTag = imageTag ?? 'latest';
	const imageTagArray = imageTag.split(',');
	for (const tag of imageTagArray) {
		args.push('--tag');
		args.push(`${imageName}:${tag}`);
	}
	args.push('--cache-from');
	args.push(`type=registry,ref=${imageTag ?? 'latest'}`);
	const configCacheFrom = devcontainerConfig.build?.cacheFrom;
	if (configCacheFrom) {
		coerceToArray(configCacheFrom).forEach(cacheValue =>
			args.push('--cache-from', cacheValue),
		);
	}
	cacheFrom.forEach(cacheValue => args.push('--cache-from', cacheValue));
	args.push('--cache-to');
	args.push('type=inline');
	args.push('--output=type=docker');

	const buildArgs = devcontainerConfig.build?.args;
	for (const argName in buildArgs) {
		const argValue = substituteValues(buildArgs[argName]);
		args.push('--build-arg', `${argName}=${argValue}`);
	}

	args.push('-f', dockerfilePath);
	args.push(contextPath);

	const {exitCode} = await exec('docker', args, {});

	if (exitCode !== 0) {
		throw new Error(`build failed with ${exitCode}`);
	}
}

// returns the name of the image to run in the next step
async function ensureHostAndContainerUsersAlign(
	exec: ExecFunction,
	imageName: string,
	imageTag: string | undefined,
	devcontainerConfig: config.DevContainerConfig,
): Promise<string> {
	if (!devcontainerConfig.remoteUser) {
		return imageName;
	}
	const resultHostUser = await exec('/bin/sh', ['-c', 'id -u -n'], {
		silent: true,
	});
	if (resultHostUser.exitCode !== 0) {
		throw new Error(
			`Failed to get host user (exitcode: ${resultHostUser.exitCode}):${resultHostUser.stdout}\n${resultHostUser.stderr}`,
		);
	}
	const resultHostPasswd = await exec('/bin/sh', ['-c', 'cat /etc/passwd'], {
		silent: true,
	});
	if (resultHostPasswd.exitCode !== 0) {
		throw new Error(
			`Failed to get host user info (exitcode: ${resultHostPasswd.exitCode}):${resultHostPasswd.stdout}\n${resultHostPasswd.stderr}`,
		);
	}
	const resultContainerPasswd = await exec(
		'docker',
		[
			'run',
			'--rm',
			`${imageName}:${imageTag ?? 'latest'}`,
			'sh',
			'-c',
			'cat /etc/passwd',
		],
		{silent: true},
	);
	if (resultContainerPasswd.exitCode !== 0) {
		throw new Error(
			`Failed to get container user info (exitcode: ${resultContainerPasswd.exitCode}):${resultContainerPasswd.stdout}\n${resultContainerPasswd.stderr}`,
		);
	}
	const resultContainerGroup = await exec(
		'docker',
		[
			'run',
			'--rm',
			`${imageName}:${imageTag ?? 'latest'}`,
			'sh',
			'-c',
			'cat /etc/group',
		],
		{silent: true},
	);
	if (resultContainerGroup.exitCode !== 0) {
		throw new Error(
			`Failed to get container group info (exitcode: ${resultContainerGroup.exitCode}):${resultContainerGroup.stdout}\n${resultContainerGroup.stderr}`,
		);
	}

	const hostUserName = resultHostUser.stdout.trim();
	const hostUsers = parsePasswd(resultHostPasswd.stdout);
	const hostUser = hostUsers.find(u => u.name === hostUserName);
	if (!hostUser) {
		console.log(`Host /etc/passwd:\n${resultHostPasswd.stdout}`);
		throw new Error(
			`Failed to find host user in host info. (hostUserName='${hostUserName}')`,
		);
	}

	const containerUserName = devcontainerConfig.remoteUser;
	const containerUsers = parsePasswd(resultContainerPasswd.stdout);
	const containerGroups = parseGroup(resultContainerGroup.stdout);
	const containerUser = containerUsers.find(u => u.name === containerUserName);
	if (!containerUser) {
		console.log(`Container /etc/passwd:\n${resultContainerPasswd.stdout}`);
		throw new Error(
			`Failed to find container user in container info. (containerUserName='${containerUserName}')`,
		);
	}

	const existingContainerUserGroup = containerGroups.find(
		g => g.gid == hostUser.gid,
	);
	if (existingContainerUserGroup)
		throw new Error(
			`Host user GID (${hostUser.gid}) already exists as a group in the container`,
		);

	const containerUserAligned =
		hostUser.uid === containerUser.uid && hostUser.gid == containerUser.gid;

	if (containerUserAligned) {
		// all good - nothing to do
		return imageName;
	}

	// Generate a Dockerfile to run to build a derived image with the UID/GID updated
	const dockerfileContent = `FROM ${imageName}:${imageTag ?? 'latest'}
RUN sudo chown -R ${hostUser.uid}:${hostUser.gid} /home/${containerUserName} \
    && sudo sed -i /etc/passwd -e s/${containerUser.name}:x:${
		containerUser.uid
	}:${containerUser.gid}/${containerUser.name}:x:${hostUser.uid}:${
		hostUser.gid
	}/
`;
	const tempDir = fs.mkdtempSync(
		path.join(os.tmpdir(), 'tmp-devcontainer-build-run'),
	);
	const derivedDockerfilePath = path.join(tempDir, 'Dockerfile');
	fs.writeFileSync(derivedDockerfilePath, dockerfileContent);

	const derivedImageName = `${imageName}-userfix`;

	// TODO - `buildx build` was giving issues when building an image for the first time and it is unable to
	// pull the image from the registry
	// const derivedDockerBuild = await exec('docker', ['buildx', 'build', '--tag', derivedImageName, '-f', derivedDockerfilePath, tempDir, '--output=type=docker'], {})
	const derivedDockerBuild = await exec(
		'docker',
		[
			'build',
			'--tag',
			`${derivedImageName}:${imageTag ?? 'latest'}`,
			'-f',
			derivedDockerfilePath,
			tempDir,
			'--output=type=docker',
		],
		{},
	);
	if (derivedDockerBuild.exitCode !== 0) {
		throw new Error('Failed to build derived Docker image with users updated');
	}

	return derivedImageName;
}

export async function runContainer(
	exec: ExecFunction,
	imageName: string,
	imageTag: string | undefined,
	checkoutPath: string,
	subFolder: string,
	command: string,
	envs?: string[],
	mounts?: string[],
): Promise<void> {
	const checkoutPathAbsolute = getAbsolutePath(checkoutPath, process.cwd());
	const folder = path.join(checkoutPathAbsolute, subFolder);

	const devcontainerJsonPath = path.join(
		folder,
		'.devcontainer/devcontainer.json',
	);
	const devcontainerConfig = await config.loadFromFile(devcontainerJsonPath);

	const workspaceFolder = config.getWorkspaceFolder(
		devcontainerConfig,
		checkoutPathAbsolute,
	);
	const workdir = path.join(workspaceFolder, subFolder);
	const remoteUser = config.getRemoteUser(devcontainerConfig);

	const args = ['run', '--rm'];
	args.push('--label', `github.com/devcontainers/ci/`);
	args.push(
		'--mount',
		`type=bind,src=${checkoutPathAbsolute},dst=${workspaceFolder}`,
	);
	if (devcontainerConfig.mounts) {
		devcontainerConfig.mounts
			.map(m => substituteValues(m))
			.forEach(m => {
				const mount = parseMount(m);
				if (mount.type === 'bind') {
					// check path exists
					if (!fs.existsSync(mount.source)) {
						console.log(`Skipping mount as source does not exist: '${m}'`);
						return;
					}
				}
				args.push('--mount', m);
			});
	}
	args.push('--workdir', workdir);
	args.push('--user', remoteUser);
	if (devcontainerConfig.runArgs) {
		const substitutedRunArgs = devcontainerConfig.runArgs.map(a =>
			substituteValues(a),
		);
		args.push(...substitutedRunArgs);
	}
	if (envs) {
		for (const env of envs) {
			args.push('--env', env);
		}
	}
	args.push(`${imageName}:${imageTag ?? 'latest'}`);
	args.push('bash', '-c', command);

	const {exitCode} = await exec('docker', args, {});

	if (exitCode !== 0) {
		throw new Error(`run failed with ${exitCode}`);
	}
}

export async function pushImage(
	exec: ExecFunction,
	imageName: string,
	imageTag: string | undefined,
): Promise<void> {
	const args = ['push'];
	args.push(`${imageName}:${imageTag ?? 'latest'}`);

	const {exitCode} = await exec('docker', args, {});

	if (exitCode !== 0) {
		throw new Error(`push failed with ${exitCode}`);
	}
}

export interface DockerMount {
	type: string;
	source: string;
	target: string;
	// ignoring readonly as not relevant
}

export function parseMount(mountString: string): DockerMount {
	// https://docs.docker.com/engine/reference/commandline/service_create/#add-bind-mounts-volumes-or-memory-filesystems
	// examples:
	//		type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock
	//		src=home-cache,target=/home/vscode/.cache

	let type = '';
	let source = '';
	let target = '';

	const options = mountString.split(',');

	for (const option of options) {
		const parts = option.split('=');

		switch (parts[0]) {
			case 'type':
				type = parts[1];
				break;
			case 'src':
			case 'source':
				source = parts[1];
				break;
			case 'dst':
			case 'destination':
			case 'target':
				target = parts[1];
				break;

			case 'readonly':
			case 'ro':
				// ignore
				break;

			default:
				throw new Error(`Unhandled mount option '${parts[0]}'`);
		}
	}

	return {type, source, target};
}
