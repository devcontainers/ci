import * as core from '@actions/core'
import * as actions_exec from '@actions/exec'
import { wait } from './wait'

function run(): Promise<void> {
  const hasRunMain = core.getState('hasRunMain')
  if (hasRunMain == "true") {
    return runPost()
  } else {
    core.saveState('hasRunMain', "true")
    return runMain()
  }
}
async function runMain(): Promise<void> {
  try {
    core.info('Hello 👋')

    const buildXInstalled = await isDockerBuildXInstalled();
    if (!buildXInstalled) {
      core.setFailed('docker buildx not available - set up with docker/setup-buildx-action')
      return
    }

    await execWithOptions("bash", {
      silent: false
    }, "-c", "echo $PWD")
    await execWithOptions("bash", {
      silent: false
    }, "-c", "ls")

    const checkoutPath: string = core.getInput("checkoutPath")
    core.info(`checkout-path: ${checkoutPath}`)
    const imageName: string = core.getInput("imageName", { required: true })

    // TODO allow build args
    let args = ['buildx', 'build']
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
  core.info("TODO - push if success")
}

async function isDockerBuildXInstalled(): Promise<boolean> {
  const r = await exec('docker', 'buildx', '--help')
  return r.exitCode === 0
}

interface ExecResponse {
  exitCode: number
  stdout: string
  stderr: string
}
interface ExecOptions {
  silent: boolean
}
function exec(command: string, ...args: string[]): Promise<ExecResponse> {
  return execWithOptions(command, {
    silent: true
  }, ...args)
}
async function execWithOptions(command: string, options: ExecOptions, ...args: string[]): Promise<ExecResponse> {
  let stdout = ''
  let stderr = ''

  const actionOptions: actions_exec.ExecOptions = {
    ignoreReturnCode: true,
    silent: options.silent,
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString()
      },
      stderr: (data: Buffer) => {
        stderr += data.toString()
      }
    }
  }
  const exitCode = await actions_exec.exec(command, args, actionOptions)

  return {
    exitCode,
    stdout,
    stderr
  }
}

run()
