import * as task from 'azure-pipelines-task-lib/task'
import {TaskResult} from 'azure-pipelines-task-lib/task'
import path from 'path'
import {populateDefaults} from '../../../common/src/envvars'
import {
	devcontainer,
	DevContainerCliBuildArgs,
	DevContainerCliExecArgs,
	DevContainerCliUpArgs
} from '../../../common/src/dev-container-cli'

import {isDockerBuildXInstalled, pushImage} from './docker'
import {exec} from './exec'

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
			console.log(
				'### WARNING: docker buildx not available: add a step to set up with docker/setup-buildx-action - see https://github.com/stuartleeks/devcontainer-build-run/blob/main/docs/azure-devops-task.md'
			)
			return
		}
		const devContainerCliInstalled = await devcontainer.isCliInstalled(exec)
		if (!devContainerCliInstalled) {
			console.log('Installing @devcontainers/cli...')
			const success = await devcontainer.installCli(exec)
			if (!success) {
				task.setResult(
					task.TaskResult.Failed,
					'@devcontainers/cli install failed!'
				)
				return
			}
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
		const inputEnvsWithDefaults = populateDefaults(envs)
		const cacheFrom = task.getInput('cacheFrom')?.split('\n') ?? []
		const skipContainerUserIdUpdate =
			(task.getInput('skipContainerUserIdUpdate') ?? 'false') === 'true'

		const log = (message: string): void => console.log(message)
		const workspaceFolder = path.resolve(checkoutPath, subFolder)
		const fullImageName = `${imageName}:${imageTag ?? 'latest'}`
		if (!cacheFrom.includes(fullImageName)) {
			// If the cacheFrom options don't include the fullImageName, add it here
			// This ensures that when building a PR where the image specified in the action
			// isn't included in devcontainer.json (or docker-compose.yml), the action still
			// resolves a previous image for the tag as a layer cache (if pushed to a registry)
			cacheFrom.splice(0, 0, fullImageName)
		}
		const buildArgs: DevContainerCliBuildArgs = {
			workspaceFolder,
			imageName: fullImageName,
			additionalCacheFroms: cacheFrom
		}

		console.log('\n\n')
		console.log('***')
		console.log('*** Building the dev container')
		console.log('***')
		const buildResult = await devcontainer.build(buildArgs, log)
		if (buildResult.outcome !== 'success') {
			console.log(
				`### ERROR: Dev container build failed: ${buildResult.message} (exit code: ${buildResult.code})\n${buildResult.description}`
			)
			task.setResult(TaskResult.Failed, buildResult.message)
		}
		if (buildResult.outcome !== 'success') {
			return
		}

		console.log('\n\n')
		console.log('***')
		console.log('*** Starting the dev container')
		console.log('***')
		const upArgs: DevContainerCliUpArgs = {
			workspaceFolder,
			additionalCacheFroms: cacheFrom,
			skipContainerUserIdUpdate
		}
		const upResult = await devcontainer.up(upArgs, log)
		if (upResult.outcome !== 'success') {
			console.log(
				`### ERROR: Dev container up failed: ${upResult.message} (exit code: ${upResult.code})\n${upResult.description}`
			)
			task.setResult(TaskResult.Failed, upResult.message)
		}
		if (upResult.outcome !== 'success') {
			return
		}

		console.log('\n\n')
		console.log('***')
		console.log('*** Running command in the dev container')
		console.log('***')
		const execArgs: DevContainerCliExecArgs = {
			workspaceFolder,
			command: ['bash', '-c', runCommand],
			env: inputEnvsWithDefaults
		}
		const execResult = await devcontainer.exec(execArgs, log)
		if (execResult.outcome !== 'success') {
			console.log(
				`### ERROR: Dev container exec: ${execResult.message} (exit code: ${execResult.code})\n${execResult.description}`
			)
			task.setResult(TaskResult.Failed, execResult.message)
		}
		if (execResult.outcome !== 'success') {
			return
		}

		// TODO - should we stop the container?
	} catch (err) {
		task.setResult(task.TaskResult.Failed, err.message)
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
