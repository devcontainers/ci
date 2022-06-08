import {
	DevContainerConfig,
	getRemoteUser,
	getWorkspaceFolder,
	loadFromString,
} from '../src/config';

describe('getWorkspaceFolder', () => {
	// TODO - need to check workspaceMount/workspaceFolder to set the source mount (https://github.com/devcontainers/ci/issues/66)
	// test('returns configured workspaceFolder', () => {
	// 	const repoPath = '/path/to/project-folder'
	// 	const devcontainerConfig: DevContainerConfig = {
	// 		workspaceFolder: '/customMount'
	// 	}
	// 	const result = getWorkspaceFolder(devcontainerConfig, repoPath)
	// 	expect(result).toBe('/customMount')
	// })
	test('returns default from repo path when not configured', () => {
		const repoPath = '/path/to/project-folder';
		const devcontainerConfig: DevContainerConfig = {};
		const result = getWorkspaceFolder(devcontainerConfig, repoPath);
		expect(result).toBe('/workspaces/project-folder');
	});
});

describe('getRemoteUser', () => {
	test('returns configured user name', () => {
		const devcontainerConfig: DevContainerConfig = {
			remoteUser: 'myUser',
		};
		const result = getRemoteUser(devcontainerConfig);
		expect(result).toBe('myUser');
	});
	test('returns `root` when not configured', () => {
		const devcontainerConfig: DevContainerConfig = {};
		const result = getRemoteUser(devcontainerConfig);
		expect(result).toBe('root');
	});
});

describe('load', () => {
	const json = `{
	"workspaceFolder": "/workspace/path",
	"remoteUser": "myUser",
	"build" : {
		"args" : {
			"ARG1": "value1",
			"ARG2": "value2",
		}
	},
	"runArgs" : [
		"test1",
		"test2"
	]
}`;
	const devcontainerConfig = loadFromString(json);

	test('workspaceFolder is correct', () => {
		expect(devcontainerConfig.workspaceFolder).toBe('/workspace/path');
	});
	test('remoteUser is correct', () => {
		expect(devcontainerConfig.remoteUser).toBe('myUser');
	});
	test('build.args to be correct', () => {
		if (!devcontainerConfig.build) {
			expect(devcontainerConfig.build).toBeDefined();
			return;
		}
		if (!devcontainerConfig.build.args) {
			expect(devcontainerConfig.build.args).toBeDefined();
			return;
		}
		expect(devcontainerConfig.build.args['ARG1']).toBe('value1');
		expect(devcontainerConfig.build.args['ARG2']).toBe('value2');
	});
	test('runArgs to be correct', () => {
		expect(devcontainerConfig.runArgs).toStrictEqual(['test1', 'test2']);
	});
});
