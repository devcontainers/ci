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
		const subFolder: string = core.getInput('subFolder')
		const runCommand: string = core.getInput('runCmd', {required: true})
		const envs: string[] = core.getMultilineInput('env')

		if (!(await buildImage(imageName, checkoutPath, subFolder))) {
			return
		}

		if (
			!(await runContainer(
				imageName,
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
	const headRef = process.env.GITHUB_HEAD_REF
	if (headRef) {
		// headRef only set on PR builds
		core.info('Image push skipped for PR builds')
		return
	}
	const imageName: string = core.getInput('imageName', {required: true})
	await pushImage(imageName)
}

run()
