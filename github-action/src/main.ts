import * as core from '@actions/core'

import {
	isDockerBuildXInstalled,
	buildImage,
	runContainer,
	pushImage
} from './docker'

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
		const subFolder: string = core.getInput('subFolder')
		const runCommand: string = core.getInput('runCmd', {required: true})
		const envs: string[] = core.getMultilineInput('env')

		const buildImageName = await buildImage(
			imageName,
			imageTag,
			checkoutPath,
			subFolder
		)
		if (buildImageName === '') {
			return
		}

		if (
			!(await runContainer(
				buildImageName,
				imageTag,
				checkoutPath,
				subFolder,
				runCommand,
				envs
			))
		) {
			return
		}
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
				`Image push skipped because GITHUB_REF (${ref}) is not in refFilterForPush`
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
