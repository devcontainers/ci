import {
	DevContainerConfig,
	getRemoteUser,
	getWorkspaceFolder
} from '../src/config'

describe('getWorkspaceFolder', () => {
	test('returns configured workspaceFolder', () => {
		const repoPath = '/path/to/project-folder'
		const devcontainerConfig: DevContainerConfig = {
			workspaceFolder: '/customMount'
		}
		const result = getWorkspaceFolder(devcontainerConfig, repoPath)
		expect(result).toBe('/customMount')
	})
	test('returns default from repo path when not configured', () => {
		const repoPath = '/path/to/project-folder'
		const devcontainerConfig: DevContainerConfig = {}
		const result = getWorkspaceFolder(devcontainerConfig, repoPath)
		expect(result).toBe('/workspaces/project-folder')
	})
})

describe('getRemoteUser', () => {
	test('returns configured user name', () => {
		const devcontainerConfig: DevContainerConfig = {
			remoteUser: 'myUser'
		}
		const result = getRemoteUser(devcontainerConfig)
		expect(result).toBe('myUser')
	})
	test('returns `root` when not configured', () => {
		const devcontainerConfig: DevContainerConfig = {}
		const result = getRemoteUser(devcontainerConfig)
		expect(result).toBe('root')
	})
})
