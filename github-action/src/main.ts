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

// List the env vars that point to paths to mount in the dev container
// See https://docs.github.com/en/actions/learn-github-actions/variables
const githubEnvs = {
	GITHUB_OUTPUT: '/mnt/github/output',
	GITHUB_ENV: '/mnt/github/env',
	GITHUB_PATH: '/mnt/github/path',
	GITHUB_STEP_SUMMARY: '/mnt/github/step-summary',
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
		const relativeConfigFile = emptyStringAsUndefined(
			core.getInput('configFile'),
		);
		const runCommand = core.getInput('runCmd');
		const inputEnvs: string[] = core.getMultilineInput('env');
		const inheritEnv: boolean = core.getBooleanInput('inheritEnv');
		const inputEnvsWithDefaults = populateDefaults(inputEnvs, inheritEnv);
		const cacheFrom: string[] = core.getMultilineInput('cacheFrom');
		const noCache: boolean = core.getBooleanInput('noCache');
		const cacheTo: string[] = core.getMultilineInput('cacheTo');
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
		const configFile =
			relativeConfigFile && path.resolve(checkoutPath, relativeConfigFile);

		const resolvedImageTag = imageTag ?? 'latest';
		const imageTagArray = resolvedImageTag.split(/\s*,\s*/);
		const fullImageNameArray: string[] = [];
		
		for (const tag of imageTagArray) {
			// For multi-platform builds, use architecture-specific tags consistently throughout
			const finalTag = platform ? `${tag}-${platform.replace('/', '-')}` : tag;
			fullImageNameArray.push(`${imageName}:${finalTag}`);
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
				configFile,
				imageName: fullImageNameArray,
				platform,
				additionalCacheFroms: cacheFrom,
				userDataFolder,
				output: buildxOutput,
				noCache,
				cacheTo,
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

		// If we have a platform specified and the image was built, get the image digest
		if (buildResult.outcome === 'success') {
			// Create a digests object to track digests for each platform
			const digestsObj: Record<string, string> = {};

			if (platform) {
				// Copy image to registry FIRST with architecture-specific tags
				for (const tag of imageTagArray) {
					const finalTag = platform ? `${tag}-${platform.replace('/', '-')}` : tag;
					const imageSource = `oci-archive:/tmp/output.tar:${finalTag}`;
					const imageDest = `docker://${imageName}:${finalTag}`;
					core.info(`Copying multiplatform image to architecture-specific tag: ${imageName}:${finalTag}`);
					await copyImage(true, imageSource, imageDest);
				}
				
				// Extract digest from registry AFTER push to get the actual registry digest
				for (const tag of imageTagArray) {
					const finalTag = platform ? `${tag}-${platform.replace('/', '-')}` : tag;
					const inspectCmd = await exec(
						'docker',
						['buildx', 'imagetools', 'inspect', `${imageName}:${finalTag}`, '--format', '{{.Manifest.Digest}}'],
						{silent: true}
					);
					
					if (inspectCmd.exitCode === 0) {
						const digest = inspectCmd.stdout.trim();
						if (digest && digest.startsWith('sha256:')) {
							core.info(`Image digest for ${platform}: ${digest}`);
							digestsObj[platform] = digest;
							break; // Found digest, stop looking
						}
					} else {
						core.warning(`Failed to inspect registry image for ${finalTag}: ${inspectCmd.stderr}`);
					}
				}
			} else if (imageName) {
				// For non-platform specific builds, use local docker inspect
				const inspectCmd = await exec(
					'docker',
					[
						'inspect',
						`${imageName}:${imageTagArray[0]}`,
						'--format',
						'{{index .RepoDigests 0}}',
					],
					{silent: true},
				);
				if (inspectCmd.exitCode === 0) {
					const digestLine = inspectCmd.stdout.trim();
					// Extract just the digest part (sha256:...)
					const digestMatch = digestLine.match(/sha256:[a-f0-9]+/);
					if (digestMatch) {
						const digest = digestMatch[0];
						core.info(`Image digest: ${digest}`);
						digestsObj['default'] = digest;
					}
				} else {
					core.warning(`Failed to get image digest: ${inspectCmd.stderr}`);
				}
			}

			// Output the digests as a JSON string
			if (Object.keys(digestsObj).length > 0) {
				const digestsJson = JSON.stringify(digestsObj);
				core.setOutput('imageDigests', digestsJson);
			}
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
					configFile,
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

			const args: DevContainerCliExecArgs = {
				workspaceFolder,
				configFile,
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
			const exitCode = await devcontainer.exec(args, execLog);
			if (exitCode !== 0) {
				const errorMessage = `Dev container exec failed: (exit code: ${exitCode})`;
				core.error(errorMessage);
				core.setFailed(errorMessage);
			}
			core.setOutput('runCmdOutput', execLogString);
			if (Buffer.byteLength(execLogString, 'utf-8') > 1000000) {
				execLogString = truncate(execLogString, 999966);
				execLogString += 'TRUNCATED TO 1 MB MAX OUTPUT SIZE';
			}
			core.setOutput('runCmdOutput', execLogString);
			if (exitCode !== 0) {
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
	const imageTagArray = imageTag.split(/\s*,\s*/);
	if (!imageName) {
		if (pushOption) {
			// pushOption was set (and not to "never") - give an error that imageName is required
			core.error('imageName is required to push images');
		}
		return;
	}

	const platform = emptyStringAsUndefined(core.getInput('platform'));
	if (platform) {
		// Platform-specific builds are now handled in runMain() to extract post-registry digests
		// Skip copying here to avoid duplicate operations
		core.info('Platform-specific image copying was handled in the main build step');
		return;
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


