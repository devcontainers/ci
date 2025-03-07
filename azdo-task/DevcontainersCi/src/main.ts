import * as task from 'azure-pipelines-task-lib/task';
import {TaskResult} from 'azure-pipelines-task-lib/task';
import path from 'path';
import {populateDefaults} from '../../../common/src/envvars';
import {
	devcontainer,
	DevContainerCliBuildArgs,
	DevContainerCliExecArgs,
	DevContainerCliUpArgs,
	MAJOR_VERSION_FALLBACK
} from '../../../common/src/dev-container-cli';

import {isDockerBuildXInstalled, pushImage} from './docker';
import {isSkopeoInstalled, copyImage} from './skopeo';
import {exec} from './exec';

export async function runMain(): Promise<void> {
	try {
		task.setTaskVariable('hasRunMain', 'true');
		const buildXInstalled = await isDockerBuildXInstalled();
		if (!buildXInstalled) {
			console.log(
				'### WARNING: docker buildx not available: add a step to set up with docker/setup-buildx-action - see https://github.com/devcontainers/ci/blob/main/docs/azure-devops-task.md',
			);
			return;
		}
		const specifiedDevContainerCliVersion =
			task.getInput('cliVersion') ?? MAJOR_VERSION_FALLBACK;
		const devContainerCliInstalled = await devcontainer.isCliInstalled(
			exec,
			specifiedDevContainerCliVersion,
		);
		if (!devContainerCliInstalled) {
			console.log('Installing @devcontainers/cli...');
			const success = await devcontainer.installCli(
				exec,
				specifiedDevContainerCliVersion,
			);
			if (!success) {
				task.setResult(
					task.TaskResult.Failed,
					'@devcontainers/cli install failed!',
				);
				return;
			}
		}

		const checkoutPath = task.getInput('checkoutPath') ?? '';
		const imageName = task.getInput('imageName');
		const imageTag = task.getInput('imageTag');
		const platform = task.getInput('platform');
		const subFolder = task.getInput('subFolder') ?? '.';
		const relativeConfigFile = task.getInput('configFile');
		const runCommand = task.getInput('runCmd');
		const envs = task.getInput('env')?.split('\n') ?? [];
		const inheritEnv = (task.getInput('inheritEnv') ?? 'false') === 'true';
		const inputEnvsWithDefaults = populateDefaults(envs, inheritEnv);
		const cacheFrom = task.getInput('cacheFrom')?.split('\n') ?? [];
		const noCache = (task.getInput('noCache') ?? 'false') === 'true';
		const cacheTo = task.getInput('cacheTo')?.split('\n') ?? [];
		const skipContainerUserIdUpdate =
			(task.getInput('skipContainerUserIdUpdate') ?? 'false') === 'true';

		if (platform) {
			const skopeoInstalled = await isSkopeoInstalled();
			if (!skopeoInstalled) {
				console.log(
					'skopeo not available and is required for multi-platform builds - make sure it is installed on your build agent',
				);
				return;
			}
		}
		const buildxOutput = platform ? 'type=oci,dest=/tmp/output.tar' : undefined;

		const log = (message: string): void => console.log(message);
		const workspaceFolder = path.resolve(checkoutPath, subFolder);
		const configFile =
			relativeConfigFile && path.resolve(checkoutPath, relativeConfigFile);

		const resolvedImageTag = imageTag ?? 'latest';
		const imageTagArray = resolvedImageTag.split(/\s*,\s*/);
		const fullImageNameArray: string[] = [];
		for (const tag of imageTagArray) {
			fullImageNameArray.push(`${imageName}:${tag}`);
		}
		if (imageName) {
			if (fullImageNameArray.length === 1) {
				if (!noCache && !cacheFrom.includes(fullImageNameArray[0])) {
					// If the cacheFrom options don't include the fullImageName, add it here
					// This ensures that when building a PR where the image specified in the action
					// isn't included in devcontainer.json (or docker-compose.yml), the action still
					// resolves a previous image for the tag as a layer cache (if pushed to a registry)
					cacheFrom.splice(0, 0, fullImageNameArray[0]);
				}
			} else {
				// Don't automatically add --cache-from if multiple image tags are specified
				console.log(
					'Not adding --cache-from automatically since multiple image tags were supplied',
				);
			}
		} else {
			console.log(
				'!! imageTag specified without specifying imageName - ignoring imageTag',
			);
		}
		const buildArgs: DevContainerCliBuildArgs = {
			workspaceFolder,
			configFile,
			imageName: fullImageNameArray,
			platform,
			additionalCacheFroms: cacheFrom,
			output: buildxOutput,
			noCache,
			cacheTo,
		};

		console.log('\n\n');
		console.log('***');
		console.log('*** Building the dev container');
		console.log('***');
		const buildResult = await devcontainer.build(buildArgs, log);
		if (buildResult.outcome !== 'success') {
			console.log(
				`### ERROR: Dev container build failed: ${buildResult.message} (exit code: ${buildResult.code})\n${buildResult.description}`,
			);
			task.setResult(TaskResult.Failed, buildResult.message);
		}
		if (buildResult.outcome !== 'success') {
			return;
		}

		if (runCommand) {
			console.log('\n\n');
			console.log('***');
			console.log('*** Starting the dev container');
			console.log('***');
			const upArgs: DevContainerCliUpArgs = {
				workspaceFolder,
				configFile,
				additionalCacheFroms: cacheFrom,
				skipContainerUserIdUpdate,
				env: inputEnvsWithDefaults,
			};
			const upResult = await devcontainer.up(upArgs, log);
			if (upResult.outcome !== 'success') {
				console.log(
					`### ERROR: Dev container up failed: ${upResult.message} (exit code: ${upResult.code})\n${upResult.description}`,
				);
				task.setResult(TaskResult.Failed, upResult.message);
			}
			if (upResult.outcome !== 'success') {
				return;
			}

			console.log('\n\n');
			console.log('***');
			console.log('*** Running command in the dev container');
			console.log('***');
			const execArgs: DevContainerCliExecArgs = {
				workspaceFolder,
				configFile,
				command: ['bash', '-c', runCommand],
				env: inputEnvsWithDefaults,
			};
			let execLogString = '';
			const execLog = (message: string): void => {
				console.log(message);
				if (!message.includes('@devcontainers/cli')) {
					execLogString += message;
				}
			};
			const execResult = await devcontainer.exec(execArgs, execLog);
			if (execResult !== 0) {
				console.log(
					`### ERROR: Dev container exec failed (exit code: ${execResult})`,
				);
				task.setResult(
					TaskResult.Failed,
					`Dev container exec failed (exit code: ${execResult})`,
				);
				return;
			}
			if (execLogString.length >= 25000) {
				execLogString = execLogString.substring(0, 24963);
				execLogString += 'TRUNCATED TO 25K CHAR MAX OUTPUT SIZE';
			}
			console.log(`##vso[task.setvariable variable=runCmdOutput]${execLog}`);
		} else {
			console.log('No runCmd set - skipping starting/running container');
		}

		// TODO - should we stop the container?
	} catch (err) {
		task.setResult(task.TaskResult.Failed, err.message);
	}
}

export async function runPost(): Promise<void> {
	const pushOption = task.getInput('push');
	const imageName = task.getInput('imageName');
	const pushOnFailedBuild =
		(task.getInput('pushOnFailedBuild') ?? 'false') === 'true';

	// default to 'never' if not set and no imageName
	if (pushOption === 'never' || (!pushOption && !imageName)) {
		console.log(`Image push skipped because 'push' is set to '${pushOption}'`);
		return;
	}

	// default to 'filter' if not set and imageName is set
	if (pushOption === 'filter' || (!pushOption && imageName)) {
		// https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
		const agentJobStatus = process.env.AGENT_JOBSTATUS;
		switch (agentJobStatus) {
			case 'Succeeded':
			case 'SucceededWithIssues':
				// continue
				break;

			default:
				if (!pushOnFailedBuild) {
					console.log(
						`Image push skipped because Agent JobStatus is '${agentJobStatus}'`,
					);
					return;
				}
		}

		const buildReasonsForPush: string[] =
			task.getInput('buildReasonsForPush')?.split('\n') ?? [];
		const sourceBranchFilterForPush: string[] =
			task.getInput('sourceBranchFilterForPush')?.split('\n') ?? [];

		// check build reason is allowed
		const buildReason = process.env.BUILD_REASON;
		if (
			buildReasonsForPush.length !== 0 && // empty filter allows all
			!buildReasonsForPush.some(s => s === buildReason)
		) {
			console.log(
				`Image push skipped because buildReason (${buildReason}) is not in buildReasonsForPush`,
			);
			return;
		}

		// check branch is allowed
		const sourceBranch = process.env.BUILD_SOURCEBRANCH;
		if (
			sourceBranchFilterForPush.length !== 0 && // empty filter allows all
			!sourceBranchFilterForPush.some(s => s === sourceBranch)
		) {
			console.log(
				`Image push skipped because source branch (${sourceBranch}) is not in sourceBranchFilterForPush`,
			);
			return;
		}
	}

	if (!imageName) {
		if (pushOption) {
			// pushOption was set (and not to "never") - give an error that imageName is required
			task.setResult(
				task.TaskResult.Failed,
				`imageName input is required to push images (push: ${pushOption})`,
			);
		}
		return;
	}
	const imageTag = task.getInput('imageTag') ?? 'latest';
	const imageTagArray = imageTag.split(/\s*,\s*/);
	const platform = task.getInput('platform');
	if (platform) {
		for (const tag of imageTagArray) {
			console.log(`Copying multiplatform image '${imageName}:${tag}'...`);
			const imageSource = `oci-archive:/tmp/output.tar:${tag}`;
			const imageDest = `docker://${imageName}:${tag}`;

			await copyImage(true, imageSource, imageDest);
		}
	} else {
		for (const tag of imageTagArray) {
			console.log(`Pushing image '${imageName}:${tag}'...`);
			await pushImage(imageName, tag);
		}
	}
}
