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
exports.copyImage = exports.isSkopeoInstalled = void 0;
function isSkopeoInstalled(exec) {
    return __awaiter(this, void 0, void 0, function* () {
        const { exitCode } = yield exec('skopeo', ['--help'], { silent: true });
        return exitCode === 0;
    });
}
exports.isSkopeoInstalled = isSkopeoInstalled;
function copyImage(exec, all, source, dest) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = ['copy'];
        if (all) {
            args.push('--all');
        }
        args.push(source, dest);
        const { exitCode } = yield exec('skopeo', args, {});
        if (exitCode !== 0) {
            throw new Error(`skopeo copy failed with ${exitCode}`);
        }
    });
}
exports.copyImage = copyImage;
