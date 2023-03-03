import * as core from '@actions/core';
import truncate from 'truncate-utf8-bytes';
import path from 'path';
import {exec} from './exec';
import {
	devcontainer,
	DevContainerCliBuildArgs,
	DevContainerCliExecArgs,
	DevContainerCliUpArgs,
} from '../../common/src/dev-container-cli';

import {isDockerBuildXInstalled, pushImage} from './docker';
import {isSkopeoInstalled, copyImage} from './skopeo';
import {populateDefaults} from '../../common/src/envvars';

const githubEnvs = {
	GITHUB_OUTPUT: '/mnt/github/output',
};

export async function runMain(): Promise<void> {
	try {
		core.info('Starting...');
		core.saveState('hasRunMain', 'true');
		const buildXInstalled = await isDockerBuildXInstalled();
		if (!buildXInstalled) {
			core.warning(
				'docker buildx not available: add a step to set up with docker/setup-buildx-action - see https://github.com/devcontainers/ci/blob/main/docs/github-action.md',
			);
			return;
		}
		const devContainerCliInstalled = await devcontainer.isCliInstalled(exec);
		if (!devContainerCliInstalled) {
			core.info('Installing @devcontainers/cli...');
			const success = await devcontainer.installCli(exec);
			if (!success) {
				core.setFailed('@devcontainers/cli install failed!');
				return;
			}
		}

		const checkoutPath: string = core.getInput('checkoutPath');
		const imageName = emptyStringAsUndefined(core.getInput('imageName'));
		const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
		const platform = emptyStringAsUndefined(core.getInput('platform'));
		const subFolder: string = core.getInput('subFolder');
		const runCommand = core.getInput('runCmd');
		const inputEnvs: string[] = core.getMultilineInput('env');
		const inputEnvsWithDefaults = populateDefaults(inputEnvs);
		const cacheFrom: string[] = core.getMultilineInput('cacheFrom');
		const noCache: boolean = core.getBooleanInput('noCache');
		const skipContainerUserIdUpdate = core.getBooleanInput(
			'skipContainerUserIdUpdate',
		);
		const userDataFolder: string = core.getInput('userDataFolder');
		const mounts: string[] = core.getMultilineInput('mounts');

		if (platform) {
			const skopeoInstalled = await isSkopeoInstalled();
			if (!skopeoInstalled) {
				core.warning(
					'skopeo not available and is required for multi-platform builds - make sure it is installed on your runner',
				);
				return;
			}
		}
		const buildxOutput = platform ? 'type=oci,dest=/tmp/output.tar' : undefined;

		const log = (message: string): void => core.info(message);
		const workspaceFolder = path.resolve(checkoutPath, subFolder);

		const resolvedImageTag = imageTag ?? 'latest';
		const imageTagArray = resolvedImageTag.split(',');
		const fullImageNameArray: string[] = [];
		for (const tag of imageTagArray) {
			fullImageNameArray.push(`${imageName}:${tag}`);
		}
		if (imageName) {
			if (fullImageNameArray.length === 1) {
				if (!noCache && !cacheFrom.includes(fullImageNameArray[0])) {
					// If the cacheFrom options don't include the fullImageName, add it here
					// This ensures that when building a PR where the image specified in the action
					// isn't included in devcontainer.json (or docker-compose.yml), the action still
					// resolves a previous image for the tag as a layer cache (if pushed to a registry)

					core.info(
						`Adding --cache-from ${fullImageNameArray[0]} to build args`,
					);
					cacheFrom.splice(0, 0, fullImageNameArray[0]);
				}
			} else {
				// Don't automatically add --cache-from if multiple image tags are specified
				core.info(
					'Not adding --cache-from automatically since multiple image tags were supplied',
				);
			}
		} else {
			if (imageTag) {
				core.warning(
					'imageTag specified without specifying imageName - ignoring imageTag',
				);
			}
		}
		const buildResult = await core.group('🏗️ build container', async () => {
			const args: DevContainerCliBuildArgs = {
				workspaceFolder,
				imageName: fullImageNameArray,
				platform,
				additionalCacheFroms: cacheFrom,
				userDataFolder,
				output: buildxOutput,
				noCache,
			};
			const result = await devcontainer.build(args, log);

			if (result.outcome !== 'success') {
				core.error(
					`Dev container build failed: ${result.message} (exit code: ${result.code})\n${result.description}`,
				);
				core.setFailed(result.message);
			}
			return result;
		});
		if (buildResult.outcome !== 'success') {
			return;
		}

		for (const [key, value] of Object.entries(githubEnvs)) {
			if (process.env[key]) {
				// Add additional bind mount
				mounts.push(`type=bind,source=${process.env[key]},target=${value}`);
				// Set env var to mounted path in container
				inputEnvsWithDefaults.push(`${key}=${value}`);
			}
		}

		if (runCommand) {
			const upResult = await core.group('🏃 start container', async () => {
				const args: DevContainerCliUpArgs = {
					workspaceFolder,
					additionalCacheFroms: cacheFrom,
					skipContainerUserIdUpdate,
					env: inputEnvsWithDefaults,
					userDataFolder,
					additionalMounts: mounts,
				};
				const result = await devcontainer.up(args, log);
				if (result.outcome !== 'success') {
					core.error(
						`Dev container up failed: ${result.message} (exit code: ${result.code})\n${result.description}`,
					);
					core.setFailed(result.message);
				}
				return result;
			});
			if (upResult.outcome !== 'success') {
				return;
			}

			const execResult = await core.group(
				'🚀 Run command in container',
				async () => {
					const args: DevContainerCliExecArgs = {
						workspaceFolder,
						command: ['bash', '-c', runCommand],
						env: inputEnvsWithDefaults,
						userDataFolder,
					};
					let execLogString = '';
					const execLog = (message: string): void => {
						core.info(message);
						if (!message.includes('@devcontainers/cli')) {
							execLogString += message;
						}
					};
					const result = await devcontainer.exec(args, execLog);
					if (result.outcome !== 'success') {
						core.error(
							`Dev container exec: ${result.message} (exit code: ${result.code})\n${result.description}`,
						);
						core.setFailed(result.message);
					}
					core.setOutput('runCmdOutput', execLogString);
					if (Buffer.byteLength(execLogString, 'utf-8') > 1000000) {
						execLogString = truncate(execLogString, 999966);
						execLogString += 'TRUNCATED TO 1 MB MAX OUTPUT SIZE';
					}
					core.setOutput('runCmdOutput', execLogString);
					return result;
				},
			);
			if (execResult.outcome !== 'success') {
				return;
			}
		} else {
			core.info('No runCmd set - skipping starting/running container');
		}

		// TODO - should we stop the container?
	} catch (error) {
		core.setFailed(error.message);
	}
}

export async function runPost(): Promise<void> {
	const pushOption = emptyStringAsUndefined(core.getInput('push'));
	const imageName = emptyStringAsUndefined(core.getInput('imageName'));
	const refFilterForPush: string[] = core.getMultilineInput('refFilterForPush');
	const eventFilterForPush: string[] =
		core.getMultilineInput('eventFilterForPush');

	// default to 'never' if not set and no imageName
	if (pushOption === 'never' || (!pushOption && !imageName)) {
		core.info(`Image push skipped because 'push' is set to '${pushOption}'`);
		return;
	}

	// default to 'filter' if not set and imageName is set
	if (pushOption === 'filter' || (!pushOption && imageName)) {
		// https://docs.github.com/en/actions/reference/environment-variables#default-environment-variables
		const ref = process.env.GITHUB_REF;
		if (
			refFilterForPush.length !== 0 && // empty filter allows all
			!refFilterForPush.some(s => s === ref)
		) {
			core.info(
				`Image push skipped because GITHUB_REF (${ref}) is not in refFilterForPush`,
			);
			return;
		}
		const eventName = process.env.GITHUB_EVENT_NAME;
		if (
			eventFilterForPush.length !== 0 && // empty filter allows all
			!eventFilterForPush.some(s => s === eventName)
		) {
			core.info(
				`Image push skipped because GITHUB_EVENT_NAME (${eventName}) is not in eventFilterForPush`,
			);
			return;
		}
	} else if (pushOption !== 'always') {
		core.setFailed(`Unexpected push value ('${pushOption})'`);
		return;
	}

	const imageTag =
		emptyStringAsUndefined(core.getInput('imageTag')) ?? 'latest';
	const imageTagArray = imageTag.split(',');
	if (!imageName) {
		if (pushOption) {
			// pushOption was set (and not to "never") - give an error that imageName is required
			core.error('imageName is required to push images');
		}
		return;
	}

	const platform = emptyStringAsUndefined(core.getInput('platform'));
	if (platform) {
		for (const tag of imageTagArray) {
			core.info(`Copying multiplatform image '${imageName}:${tag}'...`);
			const imageSource = `oci-archive:/tmp/output.tar:${tag}`;
			const imageDest = `docker://${imageName}:${tag}`;

			await copyImage(true, imageSource, imageDest);
		}
	} else {
		for (const tag of imageTagArray) {
			core.info(`Pushing image '${imageName}:${tag}'...`);
			await pushImage(imageName, tag);
		}
	}
}

function emptyStringAsUndefined(value: string): string | undefined {
	if (value === '') {
		return undefined;
	}
	return value;
}
