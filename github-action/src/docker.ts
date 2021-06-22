import * as core from '@actions/core'
import * as docker from '../../common/src/docker'
import {exec, execSilent} from './exec'


export async function isDockerBuildXInstalled(): Promise<boolean> {
	return await docker.isDockerBuildXInstalled(execSilent)
}
export async function buildImage(
	imageName: string,
	checkoutPath: string,
	subFolder: string
): Promise<boolean> {
	core.startGroup('🏗 Building dev container...')
	try {
		await docker.buildImage(exec, imageName, checkoutPath, subFolder)
		return true
	} catch (error) {
		core.setFailed(error)
		return false
	} finally {
		core.endGroup()
	}
}

export async function runContainer(
	imageName: string,
	checkoutPath: string,
	subFolder: string,
	command: string,
	envs?: string[]
): Promise<boolean> {
	core.startGroup('🏃‍♀️ Running dev container...')
	try {
		await docker.runContainer(exec, imageName, checkoutPath, subFolder, command, envs)
		return true
	} catch (error) {
		core.setFailed(error)
		return false
	} finally {
		core.endGroup()
	}
}

export async function pushImage(imageName: string): Promise<boolean> {
	core.startGroup('📌 Pushing image...')
	try {
		await docker.pushImage(exec, imageName)
		return true
	} catch (error) {
		core.setFailed(error)
		return false
	} finally {
		core.endGroup()
	}
}
