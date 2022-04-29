import * as task from 'azure-pipelines-task-lib/task'
import {errorToString} from '../../../common/src/errors'

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
		const imageTag = task.getInput('imageTag')
		const subFolder = task.getInput('subFolder') ?? '.'
		const runCommand = task.getInput('runCmd', true)
		if (!runCommand) {
			task.setResult(task.TaskResult.Failed, 'runCmd input is required')
			return
		}
		const envs = task.getInput('env')?.split('\n') ?? []
		const cacheFrom = task.getInput('cacheFrom')?.split('\n') ?? []
		const skipContainerUserIdUpdate =
			(task.getInput('skipContainerUserIdUpdate') ?? 'false') === 'true'

		const buildImageName = await buildImage(
			imageName,
			imageTag,
			checkoutPath,
			subFolder,
			skipContainerUserIdUpdate,
			cacheFrom
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
	} catch (err) {
		task.setResult(task.TaskResult.Failed, errorToString(err))
	}
}

async function runPost(): Promise<void> {
	const pushOption = task.getInput('push') ?? 'filter'
	const pushOnFailedBuild =
		(task.getInput('pushOnFailedBuild') ?? 'false') === 'true'

	if (pushOption === 'never') {
		console.log(`Image push skipped because 'push' is set to '${pushOption}'`)
		return
	}
	if (pushOption === 'filter') {
		// https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
		const agentJobStatus = process.env.AGENT_JOBSTATUS
		switch (agentJobStatus) {
			case 'Succeeded':
			case 'SucceededWithIssues':
				// continue
				break

			default:
				if (!pushOnFailedBuild) {
					console.log(
						`Image push skipped because Agent JobStatus is '${agentJobStatus}'`
					)
					return
				}
		}

		const buildReasonsForPush: string[] =
			task.getInput('buildReasonsForPush')?.split('\n') ?? []
		const sourceBranchFilterForPush: string[] =
			task.getInput('sourceBranchFilterForPush')?.split('\n') ?? []

		// check build reason is allowed
		const buildReason = process.env.BUILD_REASON
		if (
			buildReasonsForPush.length !== 0 && // empty filter allows all
			!buildReasonsForPush.some(s => s === buildReason)
		) {
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
	}

	const imageName = task.getInput('imageName', true)
	if (!imageName) {
		task.setResult(task.TaskResult.Failed, 'imageName input is required')
		return
	}
	const imageTag = task.getInput('imageTag')
	console.log(`Pushing image ''${imageName}:${imageTag ?? 'latest'}...`)
	await pushImage(imageName, imageTag)
}

run()
