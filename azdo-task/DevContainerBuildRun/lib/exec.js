"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.exec = void 0;
const task = __importStar(require("azure-pipelines-task-lib/task"));
const stream = __importStar(require("stream"));
// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md
/* global BufferEncoding */
class TeeStream extends stream.Writable {
    constructor(teeStream, options) {
        super(options);
        this.value = '';
        this.teeStream = teeStream;
    }
    _write(data, encoding, callback) {
        this.value += data;
        this.teeStream.write(data, encoding); // NOTE - currently ignoring teeStream callback
        if (callback) {
            callback();
        }
    }
    toString() {
        return this.value;
    }
}
class NullStream extends stream.Writable {
    _write(data, encoding, callback) {
        if (callback) {
            callback();
        }
    }
}
function trimCommand(input) {
    if (input.startsWith('[command]')) {
        const newLine = input.indexOf('\n');
        return input.substring(newLine + 1);
    }
    return input;
}
function exec(command, args, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const outStream = new TeeStream(options.silent ? new NullStream() : process.stdout);
        const errStream = new TeeStream(options.silent ? new NullStream() : process.stderr);
        const exitCode = yield task.exec(command, args, {
            failOnStdErr: false,
            silent: false,
            ignoreReturnCode: true,
            outStream,
            errStream
        });
        return {
            exitCode,
            stdout: trimCommand(outStream.toString()),
            stderr: errStream.toString()
        };
    });
}
exports.exec = exec;
