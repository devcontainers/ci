import * as path from 'path';
import * as fs from 'fs';
import * as jsoncParser from 'jsonc-parser';

const {readFile} = fs.promises;

export interface DevContainerConfig {
	// see https://code.visualstudio.com/docs/remote/devcontainerjson-reference
	workspaceFolder?: string;
	remoteUser?: string;
	dockerFile?: string;
	context?: string;
	build?: {
		dockerfile?: string;
		context?: string;
		args?: Record<string, string>;
		cacheFrom?: string | string[];
	};
	runArgs?: string[];
	mounts?: string[];
}

export async function loadFromFile(
	filepath: string,
): Promise<DevContainerConfig> {
	const jsonContent = await readFile(filepath);
	return loadFromString(jsonContent.toString());
}

export function loadFromString(content: string): DevContainerConfig {
	const config = jsoncParser.parse(content) as DevContainerConfig;
	return config;
}

export function getWorkspaceFolder(
	config: DevContainerConfig,
	repoPath: string,
): string {
	// TODO - need to check workspaceMount/workspaceFolder to set the source mount (https://github.com/stuartleeks/devcontainer-build-run/issues/66)
	// // https://code.visualstudio.com/docs/remote/containers-advanced#_changing-the-default-source-code-mount
	// if (config.workspaceFolder) {
	// 	return config.workspaceFolder
	// }
	return path.join('/workspaces', path.basename(repoPath));
}

export function getRemoteUser(config: DevContainerConfig): string {
	// https://code.visualstudio.com/docs/remote/containers-advanced#_specifying-a-user-for-vs-code
	return config.remoteUser ?? 'root';
}

export function getDockerfile(config: DevContainerConfig): string | undefined {
	return config.build?.dockerfile ?? config.dockerFile;
}

export function getContext(config: DevContainerConfig): string | undefined {
	return config.build?.context ?? config.context;
}
