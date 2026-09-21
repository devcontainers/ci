import * as core from '@actions/core';
import {isDockerBuildXInstalled, createMultiPlatformImage} from './docker';
import {mergeMultiPlatformImages} from '../../common/src/platform';

export async function runMain(): Promise<void> {
	try {
		const imageName = core.getInput('imageName', {required: true});
		const imageTag = core.getInput('imageTag') || 'latest';
		const platforms = core.getInput('platforms', {required: true});
		const imageTagArray = imageTag.split(/\s*,\s*/);

		const buildXInstalled = await isDockerBuildXInstalled();
		if (!buildXInstalled) {
			core.setFailed(
				'docker buildx is required - add a step to set up with docker/setup-buildx-action',
			);
			return;
		}

		const success = await mergeMultiPlatformImages(
			imageName,
			imageTagArray,
			platforms,
			createMultiPlatformImage,
			(msg: string) => core.info(msg),
		);

		if (!success) {
			core.setFailed('Failed to create multi-platform manifest');
		}
	} catch (error) {
		core.setFailed((error as Error).message);
	}
}
