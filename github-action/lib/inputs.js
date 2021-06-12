"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInputAsRecord = exports.getInputRecord = exports.parseInputAsList = exports.getInputList = void 0;
const core = __importStar(require("@actions/core"));
const sync_1 = __importDefault(require("csv-parse/lib/sync"));
function getInputList(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const input = core.getInput(name);
        return yield parseInputAsList(input);
    });
}
exports.getInputList = getInputList;
function parseInputAsList(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = [];
        if (input === '') {
            return res;
        }
        const parsedInput = (yield sync_1.default(input, {
            columns: false,
            relax: true,
            relaxColumnCount: true,
            skipLinesWithEmptyValues: true
        }));
        for (const items of parsedInput) {
            res.push(...items);
        }
        return res.map(item => item.trim());
    });
}
exports.parseInputAsList = parseInputAsList;
function getInputRecord(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const input = core.getInput(name);
        return yield parseInputAsRecord(input);
    });
}
exports.getInputRecord = getInputRecord;
function parseInputAsRecord(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = {};
        const items = yield parseInputAsList(input);
        for (const item of items) {
            const separatorIndex = item.indexOf('=');
            if (separatorIndex < 0) {
                throw new Error(`Separator '=' not found in '${item}'`);
            }
            const key = item.substring(0, separatorIndex);
            const value = item.substring(separatorIndex + 1);
            res[key] = value;
        }
        return res;
    });
}
exports.parseInputAsRecord = parseInputAsRecord;
