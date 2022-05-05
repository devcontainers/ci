import { spawn as spawnRaw } from "child_process";
export interface DevContainerCliError {
  outcome: "error",
  code: number,
  message: string,
  description: string,
}
function getSpecCliInfo() {
  // // TODO - this is temporary until the CLI is installed via npm
  // // TODO - ^ could consider an `npm install` from the folder
  // const specCLIPath = path.resolve(__dirname, "..", "cli", "cli.js");
  // return {
  //   command: `node ${specCLIPath}`,
  // };
  return {
    command: "dev-containers-cli"
  };
}


interface SpawnResult {
  code: number | null;
}

interface SpawnOptions {
  log: (data: string) => void;
  err: (data: string) => void;
  env: NodeJS.ProcessEnv;
}
function spawn(command: string, args: string[], options: SpawnOptions): Promise<SpawnResult> {

  return new Promise<SpawnResult>((resolve, reject) => {
    const proc = spawnRaw(command, args, { env: process.env });

    // const env = params.env ? { ...process.env, ...params.env } : process.env;

    proc.stdout.on("data", data => options.log(data.toString()));
    proc.stderr.on("data", data => options.err(data.toString()));

    proc.on("error", err => {
      reject(err);
    })
    proc.on("close", code => {
      resolve({
        code: code
      })
    })
  });
}



function parseCliOutput<T>(value: string): T | DevContainerCliError {
  if (value === "") {
    // TODO - revisit this
    throw new Error("Unexpected empty output from CLI");
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return {
      code: -1,
      outcome: "error" as "error",
      message: "Failed to parse CLI output",
      description: `Failed to parse CLI output as JSON: ${value}\nError: ${error}`
    }
  }
}

async function runSpecCli<T>(args: string[], log: (data: string) => void) {

  let stdout = "";
  const options: SpawnOptions = {
    log: data => stdout += data,
    err: data => log(data),
    env: process.env,
  }
  const result = await spawn(getSpecCliInfo().command, args, options)

  return parseCliOutput<T>(stdout);
}


export interface DevContainerCliSuccessResult {
  outcome: "success",
}

export interface DevContainerCliBuildResult extends DevContainerCliSuccessResult { }
export interface DevContainerCliBuildArgs {
  workspaceFolder: string;
  imageName?: string;
}
async function devContainerBuild(args: DevContainerCliBuildArgs, log: (data:string) =>void): Promise<DevContainerCliBuildResult | DevContainerCliError> {
  const commandArgs : string[] = ["build", "--workspace-folder", args.workspaceFolder];
  if (args.imageName) {
    commandArgs.push("--image-name", args.imageName);
  }
  return await runSpecCli<DevContainerCliBuildResult>(
    commandArgs,
    log,
  );
}


export interface DevContainerCliUpResult extends DevContainerCliSuccessResult {
  containerId: string;
  remoteUser: string;
  remoteWorkspaceFolder: string;
}
export interface DevContainerCliUpArgs {
  workspaceFolder: string;
}
async function devContainerUp(args: DevContainerCliUpArgs, log: (data:string) =>void): Promise<DevContainerCliUpResult | DevContainerCliError> {
  return await runSpecCli<DevContainerCliUpResult>(["up", "--workspace-folder", args.workspaceFolder], log);
}

export interface DevContainerCliExecResult extends DevContainerCliSuccessResult { }
export interface DevContainerCliExecArgs {
  workspaceFolder: string;
  command: string[];
}
async function devContainerExec(args: DevContainerCliExecArgs, log:(data:string)=>void): Promise<DevContainerCliExecResult | DevContainerCliError> {
  return await runSpecCli<DevContainerCliExecResult>(["exec", "--workspace-folder", args.workspaceFolder, ...args.command], log);
}

export const devcontainer = {
  build: devContainerBuild,
  up: devContainerUp,
  exec: devContainerExec,
};
