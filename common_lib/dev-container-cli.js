"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devcontainer = void 0;
const child_process_1 = require("child_process");
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
function spawn(command, args, options) {
    return new Promise((resolve, reject) => {
        const proc = child_process_1.spawn(command, args, { env: process.env });
        // const env = params.env ? { ...process.env, ...params.env } : process.env;
        proc.stdout.on("data", data => options.log(data.toString()));
        proc.stderr.on("data", data => options.err(data.toString()));
        proc.on("error", err => {
            reject(err);
        });
        proc.on("close", code => {
            resolve({
                code: code
            });
        });
    });
}
function parseCliOutput(value) {
    if (value === "") {
        // TODO - revisit this
        throw new Error("Unexpected empty output from CLI");
    }
    try {
        return JSON.parse(value);
    }
    catch (error) {
        return {
            code: -1,
            outcome: "error",
            message: "Failed to parse CLI output",
            description: `Failed to parse CLI output as JSON: ${value}\nError: ${error}`
        };
    }
}
function runSpecCli(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let stdout = "";
        const spawnOptions = {
            log: data => stdout += data,
            err: data => options.log(data),
            env: options.env ? Object.assign(Object.assign({}, process.env), options.env) : process.env,
        };
        yield spawn(getSpecCliInfo().command, options.args, spawnOptions);
        return parseCliOutput(stdout);
    });
}
function devContainerBuild(args, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const commandArgs = ["build", "--workspace-folder", args.workspaceFolder];
        if (args.imageName) {
            commandArgs.push("--image-name", args.imageName);
        }
        return yield runSpecCli({
            args: commandArgs,
            log,
            env: { DOCKER_BUILDKIT: "1" },
        });
    });
}
function devContainerUp(args, log) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield runSpecCli({
            args: ["up", "--workspace-folder", args.workspaceFolder],
            log,
            env: { DOCKER_BUILDKIT: "1" },
        });
    });
}
function devContainerExec(args, log) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield runSpecCli({
            args: ["exec", "--workspace-folder", args.workspaceFolder, ...args.command],
            log,
            env: { DOCKER_BUILDKIT: "1" },
        });
    });
}
exports.devcontainer = {
    build: devContainerBuild,
    up: devContainerUp,
    exec: devContainerExec,
};
