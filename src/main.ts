import * as core from '@actions/core'
import {execWithOptions} from './exec'
import {isDockerBuildXInstalled} from './docker'

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
    core.info('Hello 👋')

    const buildXInstalled = await isDockerBuildXInstalled()
    if (!buildXInstalled) {
      core.setFailed(
        'docker buildx not available - set up with docker/setup-buildx-action'
      )
      return
    }

    await execWithOptions(
      'bash',
      {
        silent: false
      },
      '-c',
      'echo $PWD'
    )
    await execWithOptions(
      'bash',
      {
        silent: false
      },
      '-c',
      'ls'
    )

    const checkoutPath: string = core.getInput('checkoutPath')
    core.info(`checkout-path: ${checkoutPath}`)
    const imageName: string = core.getInput('imageName', {required: true})

    // TODO allow build args
    const args = ['buildx', 'build']
    args.push('--tag')
    args.push(`${imageName}:latest`)
    args.push('--cache-from')
    args.push(`type=registry,ref=${imageName}:latest`)
    args.push('--cache-to')
    args.push('type=inline')
    args.push(`${checkoutPath}/.devcontainer`) // TODO Add input

    core.info("Building dev container...")
    const buildResponse = await execWithOptions('docker', { silent: false }, ...args)

      if (buildResponse.exitCode != 0) {
        core.setFailed(`build failed with ${buildResponse.exitCode}: ${buildResponse.stderr}`)
        return
      }
      core.info(buildResponse.stdout)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function runPost(): Promise<void> {
  core.info('TODO - push')
}

run()
