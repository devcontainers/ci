import * as task from 'azure-pipelines-task-lib/task'
import * as docker from '../../../common/src/docker'
import {exec} from './exec'

export async function isDockerBuildXInstalled(): Promise<boolean> {
	return await docker.isDockerBuildXInstalled(exec)
}
export async function buildImage(
	imageName: string,
	checkoutPath: string,
	subFolder: string
): Promise<boolean> {
	console.log('🏗 Building dev container...')
	try {
		await docker.buildImage(exec, imageName, checkoutPath, subFolder)
		return true
	} catch (error) {
		task.setResult(task.TaskResult.Failed, error)
		return false
	}
}

export async function runContainer(
	imageName: string,
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

export async function pushImage(imageName: string): Promise<boolean> {
	console.log('📌 Pushing image...')
	try {
		await docker.pushImage(exec, imageName)
		return true
	} catch (error) {
		task.setResult(task.TaskResult.Failed, error)
		return false
	}
}
