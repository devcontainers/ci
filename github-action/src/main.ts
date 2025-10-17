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

// Helper function to parse multiline input and filter out empty lines
function parseMultilineInput(input: string): string[] {
	return input
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);
}

// Helper function to construct full image names from images and tags
function constructFullImageNames(images: string[], tags: string[]): string[] {
	const fullImageNames: string[] = [];
	
	if (images.length === 0) {
		// If no images specified, return tags as-is (they might be full image names)
		return tags;
	}
	
	if (tags.length === 0) {
		// If no tags specified, default to 'latest'
		tags = ['latest'];
	}
	
	// Create cartesian product of images and tags
	for (const image of images) {
		for (const tag of tags) {
			// Check if tag is already a full image name (contains ':')
			if (tag.includes(':')) {
				fullImageNames.push(tag);
			} else {
				fullImageNames.push(`${image}:${tag}`);
			}
		}
	}
	
	return fullImageNames;
}

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
		
		// Get legacy inputs
		const imageName = emptyStringAsUndefined(core.getInput('imageName'));
		const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
		
		// Get new inputs (these take precedence)
		const imagesInput = core.getInput('images');
		const tagsInput = core.getInput('tags');
		
		// Parse and determine which inputs to use
		let images: string[] = [];
		let tags: string[] = [];
		
		if (imagesInput || tagsInput) {
			// Use new input format
			if (imagesInput) {
				images = parseMultilineInput(imagesInput);
			}
			if (tagsInput) {
				tags = parseMultilineInput(tagsInput);
			}
		} else if (imageName || imageTag) {
			// Use legacy input format
			if (imageName) {
				images = [imageName];
			}
			if (imageTag) {
				tags = imageTag.split(/\s*,\s*/);
			}
		}
		
		// Construct full image names
		const fullImageNameArray = constructFullImageNames(images, tags);
		
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

		// Handle caching logic for full image names
		if (fullImageNameArray.length > 0) {
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
			// Legacy warning message for backwards compatibility
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
	const refFilterForPush: string[] = core.getMultilineInput('refFilterForPush');
	const eventFilterForPush: string[] =
		core.getMultilineInput('eventFilterForPush');

	// Get legacy and new inputs for determining image names to push
	const imageName = emptyStringAsUndefined(core.getInput('imageName'));
	const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
	const imagesInput = core.getInput('images');
	const tagsInput = core.getInput('tags');
	
	// Parse and determine which inputs to use
	let images: string[] = [];
	let tags: string[] = [];
	
	if (imagesInput || tagsInput) {
		// Use new input format
		if (imagesInput) {
			images = parseMultilineInput(imagesInput);
		}
		if (tagsInput) {
			tags = parseMultilineInput(tagsInput);
		}
	} else if (imageName || imageTag) {
		// Use legacy input format
		if (imageName) {
			images = [imageName];
		}
		if (imageTag) {
			tags = imageTag.split(/\s*,\s*/);
		}
	}
	
	// Construct full image names
	const fullImageNameArray = constructFullImageNames(images, tags);
	const hasImageNames = fullImageNameArray.length > 0;

	// default to 'never' if not set and no imageName/images
	if (pushOption === 'never' || (!pushOption && !hasImageNames)) {
		core.info(`Image push skipped because 'push' is set to '${pushOption}'`);
		return;
	}

	// default to 'filter' if not set and imageName/images is set
	if (pushOption === 'filter' || (!pushOption && hasImageNames)) {
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

	if (!hasImageNames) {
		if (pushOption) {
			// pushOption was set (and not to "never") - give an error that imageName/images is required
			core.error('imageName or images is required to push images');
		}
		return;
	}

	const platform = emptyStringAsUndefined(core.getInput('platform'));
	if (platform) {
		// For multi-platform builds, fullImageNameArray contains full image:tag combinations
		for (const fullImageName of fullImageNameArray) {
			core.info(`Copying multiplatform image '${fullImageName}'...`);
			const [imageName, tag] = fullImageName.split(':');
			const imageSource = `oci-archive:/tmp/output.tar:${tag}`;
			const imageDest = `docker://${fullImageName}`;

			await copyImage(true, imageSource, imageDest);
		}
	} else {
		// For single-platform builds, parse image and tag for each full image name
		for (const fullImageName of fullImageNameArray) {
			core.info(`Pushing image '${fullImageName}'...`);
			const lastColonIndex = fullImageName.lastIndexOf(':');
			if (lastColonIndex > -1) {
				const imageName = fullImageName.substring(0, lastColonIndex);
				const tag = fullImageName.substring(lastColonIndex + 1);
				await pushImage(imageName, tag);
			} else {
				// Fallback: treat as image name with 'latest' tag
				await pushImage(fullImageName, 'latest');
			}
		}
	}
}

function emptyStringAsUndefined(value: string): string | undefined {
	if (value === '') {
		return undefined;
	}
	return value;
}
