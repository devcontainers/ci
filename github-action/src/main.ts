import * as core from '@actions/core'
import {
	devcontainer,
	DevContainerCliBuildArgs,
	DevContainerCliExecArgs,
	DevContainerCliUpArgs
} from '../../common/src/dev-container-cli'

import {isDockerBuildXInstalled, pushImage} from './docker'

async function run(): Promise<void> {
	const hasRunMain = core.getState('hasRunMain')
	if (hasRunMain === 'true') {
		return await runPost()
	} else {
		core.saveState('hasRunMain', 'true')
		return await runMain()
	}
}
async function runMain(): Promise<void> {
	try {
		const buildXInstalled = await isDockerBuildXInstalled()
		if (!buildXInstalled) {
			core.setFailed(
				'docker buildx not available: add a step to set up with docker/setup-buildx-action'
			)
			return
		}

		const checkoutPath: string = core.getInput('checkoutPath')
		const imageName: string = core.getInput('imageName', {required: true})
		const imageTag = emptyStringAsUndefined(core.getInput('imageTag'))
		// const subFolder: string = core.getInput('subFolder') // TODO - handle this
		const runCommand: string = core.getInput('runCmd', {required: true})
		// const envs: string[] = core.getMultilineInput('env') // TODO - handle this
		// const cacheFrom: string[] = core.getMultilineInput('cacheFrom') // TODO - handle this
		// const skipContainerUserIdUpdate = core.getBooleanInput(
		// 	'skipContainerUserIdUpdate'
		// ) // TODO - handle this

		// TODO - nocache
		// TODO - support additional cacheFrom
		const log = (message: string): void => core.info(message)
		const fullImageName = `${imageName}:${imageTag ?? 'latest'}`
		const buildArgs: DevContainerCliBuildArgs = {
			workspaceFolder: checkoutPath,
			imageName: fullImageName
		}
		const buildResult = await devcontainer.build(buildArgs, log)

		if (buildResult.outcome !== 'success') {
			core.error(
				`Dev container build failed: ${buildResult.message} (exit code: ${buildResult.code})\n${buildResult.description}`
			)
			core.setFailed(buildResult.message)
			return
		}

		const upArgs: DevContainerCliUpArgs = {
			workspaceFolder: checkoutPath
		}
		const upResult = await devcontainer.up(upArgs, log)
		if (upResult.outcome !== 'success') {
			core.error(
				`Dev container up failed: ${upResult.message} (exit code: ${upResult.code})\n${upResult.description}`
			)
			core.setFailed(upResult.message)
			return
		}

		const execArgs: DevContainerCliExecArgs = {
			workspaceFolder: checkoutPath,
			command: ['bash', '-c', runCommand]
		}
		const execResult = await devcontainer.exec(execArgs, log)
		if (execResult.outcome !== 'success') {
			core.error(
				`Dev container exec: ${execResult.message} (exit code: ${execResult.code})\n${execResult.description}`
			)
			core.setFailed(execResult.message)
			return
		}

		// TODO - should we stop the container?
	} catch (error) {
		core.setFailed(error.message)
	}
}

async function runPost(): Promise<void> {
	const pushOption: string = valueOrDefault(core.getInput('push'), 'filter')
	const refFilterForPush: string[] = core.getMultilineInput('refFilterForPush')
	const eventFilterForPush: string[] =
		core.getMultilineInput('eventFilterForPush')

	if (pushOption === 'never') {
		core.info(`Image push skipped because 'push' is set to '${pushOption}'`)
		return
	}

	if (pushOption === 'filter') {
		// https://docs.github.com/en/actions/reference/environment-variables#default-environment-variables
		const ref = process.env.GITHUB_REF
		if (
			refFilterForPush.length !== 0 && // empty filter allows all
			!refFilterForPush.some(s => s === ref)
		) {
			core.info(
				`Immage push skipped because GITHUB_REF (${ref}) is not in refFilterForPush`
			)
			return
		}
		const eventName = process.env.GITHUB_EVENT_NAME
		if (
			eventFilterForPush.length !== 0 && // empty filter allows all
			!eventFilterForPush.some(s => s === eventName)
		) {
			core.info(
				`Image push skipped because GITHUB_EVENT_NAME (${eventName}) is not in eventFilterForPush`
			)
			return
		}
	} else if (pushOption !== 'always') {
		core.setFailed(`Unexpected push value ('${pushOption})'`)
		return
	}

	const imageName: string = core.getInput('imageName', {required: true})
	const imageTag = emptyStringAsUndefined(core.getInput('imageTag'))
	core.info(`Pushing image ''${imageName}:${imageTag ?? 'latest'}...`)
	await pushImage(imageName, imageTag)
}

function valueOrDefault(value: string, defaultValue: string): string {
	if (!value || value === '') {
		return defaultValue
	}
	return value
}
function emptyStringAsUndefined(value: string): string | undefined {
	if (value === '') {
		return undefined
	}
	return value
}

run()
