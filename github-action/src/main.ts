import * as core from '@actions/core'
import path from 'path'
import {exec} from './exec'
import {
	devcontainer,
	DevContainerCliBuildArgs,
	DevContainerCliExecArgs,
	DevContainerCliUpArgs
} from '../../common/src/dev-container-cli'

import {isDockerBuildXInstalled, pushImage} from './docker'
import {populateDefaults} from '../../common/src/envvars'

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
		core.info('Starting...')
		const buildXInstalled = await isDockerBuildXInstalled()
		if (!buildXInstalled) {
			core.setFailed(
				'docker buildx not available: add a step to set up with docker/setup-buildx-action'
			)
			return
		}
		const devContainerCliInstalled = await devcontainer.isCliInstalled(exec)
		if (!devContainerCliInstalled) {
			core.info('Installing dev-containers-cli...')
			const success = await devcontainer.installCli(exec)
			if (!success) {
				core.setFailed('dev-containers-cli install failed!')
				return
			}
		}

		const checkoutPath: string = core.getInput('checkoutPath')
		const imageName: string = core.getInput('imageName', {required: true})
		const imageTag = emptyStringAsUndefined(core.getInput('imageTag'))
		const subFolder: string = core.getInput('subFolder')
		const runCommand: string = core.getInput('runCmd', {required: true})
		const inputEnvs: string[] = core.getMultilineInput('env')
		const inputEnvsWithDefaults = populateDefaults(inputEnvs)
		// const cacheFrom: string[] = core.getMultilineInput('cacheFrom') // TODO - handle this
		// const skipContainerUserIdUpdate = core.getBooleanInput(
		// 	'skipContainerUserIdUpdate'
		// ) // TODO - handle this

		// TODO - nocache
		// TODO - support additional cacheFrom

		const log = (message: string): void => core.info(message)
		const workspaceFolder = path.resolve(checkoutPath, subFolder)
		const fullImageName = `${imageName}:${imageTag ?? 'latest'}`
		const buildResult = await core.group('build container', async () => {
			const args: DevContainerCliBuildArgs = {
				workspaceFolder,
				imageName: fullImageName
			}
			const result = await devcontainer.build(args, log)

			if (result.outcome !== 'success') {
				core.error(
					`Dev container build failed: ${result.message} (exit code: ${result.code})\n${result.description}`
				)
				core.setFailed(result.message)
			}
			return result
		})
		if (buildResult.outcome !== 'success') {
			return
		}

		const upResult = await core.group('start container', async () => {
			const args: DevContainerCliUpArgs = {
				workspaceFolder
			}
			const result = await devcontainer.up(args, log)
			if (result.outcome !== 'success') {
				core.error(
					`Dev container up failed: ${result.message} (exit code: ${result.code})\n${result.description}`
				)
				core.setFailed(result.message)
			}
			return result
		})
		if (upResult.outcome !== 'success') {
			return
		}

		const execResult = await core.group(
			'Run command in container',
			async () => {
				const args: DevContainerCliExecArgs = {
					workspaceFolder,
					command: ['bash', '-c', runCommand],
					env: inputEnvsWithDefaults
				}
				core.info(`***env vars: ${JSON.stringify(inputEnvsWithDefaults)}}`)
				const result = await devcontainer.exec(args, log)
				if (result.outcome !== 'success') {
					core.error(
						`Dev container exec: ${result.message} (exit code: ${result.code})\n${result.description}`
					)
					core.setFailed(result.message)
				}
				return result
			}
		)
		if (execResult.outcome !== 'success') {
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
