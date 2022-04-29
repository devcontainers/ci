import * as core from '@actions/core'
import * as docker from '../../common/src/docker'
import {errorToString} from '../../common/src/errors'
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
	core.startGroup('🏗 Building dev container...')
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
		core.setFailed(errorToString(error))
		return ''
	} finally {
		core.endGroup()
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
	core.startGroup('🏃‍♀️ Running dev container...')
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
		core.setFailed(errorToString(error))
		return false
	} finally {
		core.endGroup()
	}
}

export async function pushImage(
	imageName: string,
	imageTag: string | undefined
): Promise<boolean> {
	core.startGroup('📌 Pushing image...')
	try {
		await docker.pushImage(exec, imageName, imageTag)
		return true
	} catch (error) {
		core.setFailed(errorToString(error))
		return false
	} finally {
		core.endGroup()
	}
}
