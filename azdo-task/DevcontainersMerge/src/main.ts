import * as task from 'azure-pipelines-task-lib/task';
import {isDockerBuildXInstalled, createMultiPlatformImage} from './docker';
import {mergeMultiPlatformImages} from '../../../common/src/platform';

export async function runMain(): Promise<void> {
	try {
		const imageName = task.getInput('imageName', true);
		const imageTag = task.getInput('imageTag') ?? 'latest';
		const platforms = task.getInput('platforms', true);
		const imageTagArray = imageTag.split(/\s*,\s*/);

		if (!imageName || !platforms) {
			task.setResult(
				task.TaskResult.Failed,
				'imageName and platforms are required',
			);
			return;
		}

		const buildXInstalled = await isDockerBuildXInstalled();
		if (!buildXInstalled) {
			task.setResult(
				task.TaskResult.Failed,
				'docker buildx is required - add a step to set up docker buildx',
			);
			return;
		}

		const success = await mergeMultiPlatformImages(
			imageName,
			imageTagArray,
			platforms,
			createMultiPlatformImage,
			(msg: string) => console.log(msg),
		);

		if (!success) {
			task.setResult(
				task.TaskResult.Failed,
				'Failed to create multi-platform manifest',
			);
		}
	} catch (err) {
		task.setResult(task.TaskResult.Failed, (err as Error).message);
	}
}
