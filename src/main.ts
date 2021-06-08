import * as core from '@actions/core'
import {Parser} from 'csv-parse'
import csvparse from 'csv-parse/lib/sync'

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
		const subFolder: string = core.getInput('subFolder',)
		const runCommand: string = core.getInput('runCmd', {required: true})

		if (!(await buildImage(imageName, checkoutPath, subFolder))) {
			return
		}

		if (!(await runContainer(imageName, checkoutPath, subFolder, runCommand))) {
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


async function getInputList(name: string): Promise<string[]> {
	let res: string[] = [];

	const input = core.getInput(name);
	if (input == '') {
		return res;
	}

	const parsedInput = (await csvparse(input, {
		columns: false,
		relax: true,
		relaxColumnCount: true,
		skipLinesWithEmptyValues: true
	})) as string[][]

	for (let items of parsedInput) {
		res.push(...items);
	}

	return res.map(item => item.trim());
}
