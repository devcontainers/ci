import * as core from '@actions/core';
import {pushImage} from '../src/docker';
import {runPost} from '../src/main';
import {copyImage} from '../src/skopeo';

jest.mock('@actions/core');
jest.mock('../src/docker');
jest.mock('../src/skopeo');

describe('post-step ref filters', () => {
	let inputs: Record<string, string>;
	let refs: string[];
	let events: string[];
	const environment = process.env;

	beforeEach(() => {
		inputs = {imageName: 'example.invalid/devcontainer', push: 'filter'};
		refs = ['refs/heads/main', 'refs/heads/releases/v*'];
		events = ['push'];
		process.env = {
			...environment,
			GITHUB_REF: 'refs/heads/releases/v1.4',
			GITHUB_EVENT_NAME: 'push',
		};
		jest.mocked(core.getInput).mockImplementation(name => inputs[name] ?? '');
		jest
			.mocked(core.getMultilineInput)
			.mockImplementation(name =>
				name === 'refFilterForPush' ? refs : events,
			);
		jest.mocked(core.getState).mockReturnValue('');
	});

	afterEach(() => {
		process.env = environment;
	});

	test('an unset mode does not interpret stars in existing filters', async () => {
		await runPost();

		expect(pushImage).not.toHaveBeenCalled();
		expect(copyImage).not.toHaveBeenCalled();
		expect(core.setFailed).not.toHaveBeenCalled();
	});

	test('the default matches a literal ref in the list', async () => {
		process.env.GITHUB_REF = 'refs/heads/main';
		await runPost();

		expect(pushImage).toHaveBeenCalledWith(inputs.imageName, 'latest');
	});

	test('glob mode opts into wildcard matching', async () => {
		inputs.refFilterForPushMode = 'glob';
		await runPost();

		expect(pushImage).toHaveBeenCalledWith(inputs.imageName, 'latest');
	});

	test('glob mode still accepts literal entries alongside patterns', async () => {
		inputs.refFilterForPushMode = 'glob';
		process.env.GITHUB_REF = 'refs/heads/main';
		await runPost();

		expect(pushImage).toHaveBeenCalledWith(inputs.imageName, 'latest');
	});

	test('a glob does not allow a ref from another namespace', async () => {
		inputs.refFilterForPushMode = 'glob';
		process.env.GITHUB_REF = 'refs/tags/releases/v1.4';
		await runPost();

		expect(pushImage).not.toHaveBeenCalled();
	});

	test('glob mode still applies the event filter', async () => {
		inputs.refFilterForPushMode = 'glob';
		process.env.GITHUB_EVENT_NAME = 'pull_request';
		await runPost();

		expect(pushImage).not.toHaveBeenCalled();
	});

	test('an empty ref list still allows all refs', async () => {
		inputs.refFilterForPushMode = 'glob';
		refs = [];
		await runPost();

		expect(pushImage).toHaveBeenCalledWith(inputs.imageName, 'latest');
	});

	test('a missing ref does not match a nonempty glob list', async () => {
		inputs.refFilterForPushMode = 'glob';
		delete process.env.GITHUB_REF;
		await runPost();

		expect(pushImage).not.toHaveBeenCalled();
	});

	test('an invalid mode fails without publishing', async () => {
		inputs.refFilterForPushMode = 'GLOB';
		await runPost();

		expect(core.setFailed).toHaveBeenCalledWith(
			expect.stringContaining('Unexpected refFilterForPushMode'),
		);
		expect(pushImage).not.toHaveBeenCalled();
		expect(copyImage).not.toHaveBeenCalled();
	});

	test('always still ignores ref and event filters', async () => {
		inputs.push = 'always';
		inputs.refFilterForPushMode = 'glob';
		process.env.GITHUB_REF = 'refs/heads/unrelated';
		process.env.GITHUB_EVENT_NAME = 'pull_request';
		await runPost();

		expect(pushImage).toHaveBeenCalledWith(inputs.imageName, 'latest');
	});

	test('never still suppresses a matching push', async () => {
		inputs.push = 'never';
		inputs.refFilterForPushMode = 'glob';
		await runPost();

		expect(pushImage).not.toHaveBeenCalled();
	});
});
