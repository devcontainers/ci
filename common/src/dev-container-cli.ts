import * as path from "path";
import {exec as execRaw} from "child_process";
import {promisify} from "util";
import {runMain} from "module";
const exec = promisify(execRaw);

console.log("Hi");

function getSpecCliInfo() {
  // TODO - this is temporary until the CLI is installed via npm
  // TODO - ^ could consider an `npm install` from the folder
  const specCLIPath = path.resolve(__dirname, "..", "cli", "cli.js");
  return {
    command: `node ${specCLIPath}`,
  };
}

async function runSpecCli<T>(args: string) {

  const command = `${getSpecCliInfo().command} ${args}`;
  const commandResult = await exec(command);

  return {
    result: JSON.parse(commandResult.stdout) as T,
    log: commandResult.stderr,
  };
}
