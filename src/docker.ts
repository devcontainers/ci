import {exec} from './exec'

export async function isDockerBuildXInstalled(): Promise<boolean> {
  const r = await exec('docker', 'buildx', '--help')
  return r.exitCode === 0
}
