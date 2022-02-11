import * as task from 'azure-pipelines-task-lib/task'
import * as docker from '../../../common/src/docker'
import {exec} from './exec'

export async function isDockerBuildXInstalled(): Promise<boolean> {
	return await docker.isDockerBuildXInstalled(exec)
}
export async function buildImage(
	imageName: string,
	imageTag: string | undefined,
	checkoutPath: string,
	subFolder: string,
	skipContainerUserIdUpdate: boolean,
	cacheFrom: string[]
): Promise<string> {
	console.log('🏗 Building dev container...')
	try {
		return await docker.buildImage(
			exec,
			imageName,
			imageTag,
			checkoutPath,
			subFolder,
			skipContainerUserIdUpdate,
			cacheFrom
		)
	} catch (error) {
		task.setResult(task.TaskResult.Failed, error)
		return ''
	}
}

export async function runContainer(
	imageName: string,
	imageTag: string | undefined,
	checkoutPath: string,
	subFolder: string,
	command: string,
	envs?: string[]
): Promise<boolean> {
	console.log('🏃‍♀️ Running dev container...')
	try {
		await docker.runContainer(
			exec,
			imageName,
			imageTag,
			checkoutPath,
			subFolder,
			command,
			envs
		)
		return true
	} catch (error) {
		task.setResult(task.TaskResult.Failed, error)
		return false
	}
}

export async function pushImage(
	imageName: string,
	imageTag: string | undefined
): Promise<boolean> {
	console.log('📌 Pushing image...')
	try {
		await docker.pushImage(exec, imageName, imageTag)
		return true
	} catch (error) {
		task.setResult(task.TaskResult.Failed, error)
		return false
	}
}
