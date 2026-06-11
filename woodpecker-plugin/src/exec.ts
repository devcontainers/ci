import { spawn } from "child_process";
import { ExecOptions, ExecResult } from "../../common/src/exec";

export async function exec(
  command: string,
  args: string[],
  options: ExecOptions,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const silent = options.silent ?? false;
    let stdout = "";
    let stderr = "";

    const child = spawn(command, args, {
      stdio: silent ? "pipe" : ["inherit", "pipe", "pipe"],
    });

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        if (!silent) {
          process.stdout.write(text);
        }
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        if (!silent) {
          process.stderr.write(text);
        }
      });
    }

    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 0,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      stderr += error.message;
      resolve({
        exitCode: 1,
        stdout,
        stderr,
      });
    });
  });
}
