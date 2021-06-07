import * as path from 'path'
import * as fs from 'fs'
import * as jsoncParser from 'jsonc-parser'

const {readFile} = fs.promises

export interface DevContainerConfig {
	workspaceFolder?: string
	remoteUser?: string
}

export async function loadFromFile(
	filepath: string
): Promise<DevContainerConfig> {
	const jsonContent = await readFile(filepath)
	const config = jsoncParser.parse(jsonContent.toString()) as DevContainerConfig
	return config
}

export function getWorkspaceFolder(
	config: DevContainerConfig,
	repoPath: string
): string {
	// https://code.visualstudio.com/docs/remote/containers-advanced#_changing-the-default-source-code-mount
	if (config.workspaceFolder) {
		return config.workspaceFolder
	}
	return path.join('/workspaces', path.basename(repoPath))
}

export function getRemoteUser(config: DevContainerConfig): string {
	// https://code.visualstudio.com/docs/remote/containers-advanced#_specifying-a-user-for-vs-code
	return config.remoteUser ?? 'root'
}
