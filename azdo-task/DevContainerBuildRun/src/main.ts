import * as task from 'azure-pipelines-task-lib/task'

import {
	isDockerBuildXInstalled,
	buildImage,
	runContainer,
	pushImage
} from './docker'

async function run(): Promise<void> {
	console.log('DevContainerBuildRun starting...')
	const hasRunMain = task.getTaskVariable('hasRunMain')
	if (hasRunMain === 'true') {
		console.log('DevContainerBuildRun running post step...')
		return await runPost()
	} else {
		console.log('DevContainerBuildRun running main step...')
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
	// buildReasonsForPush
	//sourceBranchFilterForPush

	const buildReasonsForPush: string[] =
		task.getInput('buildReasonsForPush')?.split('\n') ?? []
	const sourceBranchFilterForPush: string[] =
		task.getInput('sourceBranchFilterForPush')?.split('\n') ?? []

	// check build reason is allowed
	const buildReason = process.env.BUILD_REASON
	if (!buildReasonsForPush.some(s => s === buildReason)) {
		console.log(
			`Image push skipped because buildReason (${buildReason}) is not in buildReasonsForPush`
		)
		return
	}

	// check branch is allowed
	const sourceBranch = process.env.BUILD_SOURCEBRANCH
	if (
		sourceBranchFilterForPush.length !== 0 && // empty filter allows all
		!sourceBranchFilterForPush.some(s => s === sourceBranch)
	) {
		console.log(
			`Image push skipped because source branch (${sourceBranch}) is not in sourceBranchFilterForPush`
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
