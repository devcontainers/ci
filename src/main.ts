import * as core from '@actions/core'
import * as actions_exec from '@actions/exec'
import {wait} from './wait'

async function run(): Promise<void> {
  try {
    core.info('Hello 👋')

    const r = await exec('docker', 'version')
    core.info(`Got exit code: ${r.exitCode}`)
    core.info('Done')
    
    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true

    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    core.setFailed(error.message)
  }
}

interface ExecResponse {
  exitCode: number
  stdout: string
  stderr: string
}
async function exec(command: string, ...args: string[]): Promise<ExecResponse> {
  let stdout = ''
  let stderr = ''

  const options: actions_exec.ExecOptions = {
    ignoreReturnCode: true,
    silent: true,
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString()
      },
      stderr: (data: Buffer) => {
        stderr += data.toString()
      }
    }
  }
  const exitCode = await actions_exec.exec(command, args, options)

  return {
    exitCode,
    stdout,
    stderr
  }
}

run()
