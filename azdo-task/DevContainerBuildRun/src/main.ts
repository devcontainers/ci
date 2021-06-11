import * as task from 'azure-pipelines-task-lib/task'

import {
	isDockerBuildXInstalled,
	buildImage,
	runContainer,
	pushImage
} from './docker'

async function run(): Promise<void> {
	const hasRunMain = task.getTaskVariable('hasRunMain')
	if (hasRunMain === 'true') {
		return await runPost()
	} else {
		task.setTaskVariable('hasRunMain', 'true')
		return await runMain()
	}
}

async function runMain(): Promise<void> {
	try {
		const buildXInstalled = await isDockerBuildXInstalled()
		if (!buildXInstalled) {
			task.setResult(
				task.TaskResult.Failed,
				'docker buildx not available: add a step to set up with docker/setup-buildx-action'
			)
			return
		}

		const checkoutPath = task.getInput('checkoutPath') ?? ''
		const imageName = task.getInput('imageName', true)
		if (!imageName) {
			task.setResult(task.TaskResult.Failed, 'imageName input is required')
			return
		}
		const subFolder = task.getInput('subFolder') ?? '.'
		const runCommand = task.getInput('runCmd', true)
		if (!runCommand) {
			task.setResult(task.TaskResult.Failed, 'runCmd input is required')
			return
		}
		const envs = task.getInput('env')?.split('\n') ?? []

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
	} catch (err) {
		task.setResult(task.TaskResult.Failed, err.message)
	}
}

async function runPost(): Promise<void> {
	const buildReason = process.env.BUILD_REASON
	if (buildReason !== 'IndividualCI') {
		// headRef only set on PR builds
		console.log(
			`Image push skipped for PR builds (buildReason was ${buildReason})`
		)
		return
	}
	const imageName = task.getInput('imageName', true)
	if (!imageName) {
		task.setResult(task.TaskResult.Failed, 'imageName input is required')
		return
	}
	await pushImage(imageName)
}

run()
