"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.containerSubstitute = exports.substitute = void 0;
const path = __importStar(require("path"));
const errors_1 = require("./errors");
function substitute(context, value) {
    let env;
    const isWindows = context.platform === 'win32';
    const updatedContext = {
        ...context,
        get env() {
            return env || (env = normalizeEnv(isWindows, context.env));
        }
    };
    const replace = replaceWithContext.bind(undefined, isWindows, updatedContext);
    if (context.containerWorkspaceFolder) {
        updatedContext.containerWorkspaceFolder = resolveString(replace, context.containerWorkspaceFolder);
    }
    return substitute0(replace, value);
}
exports.substitute = substitute;
function containerSubstitute(platform, configFile, containerEnv, value) {
    const isWindows = platform === 'win32';
    return substitute0(replaceContainerEnv.bind(undefined, isWindows, configFile, normalizeEnv(isWindows, containerEnv)), value);
}
exports.containerSubstitute = containerSubstitute;
function substitute0(replace, value) {
    if (typeof value === 'string') {
        return resolveString(replace, value);
    }
    else if (Array.isArray(value)) {
        return value.map(s => substitute0(replace, s));
    }
    else if (value && typeof value === 'object') {
        const result = Object.create(null);
        Object.keys(value).forEach(key => {
            result[key] = substitute0(replace, value[key]);
        });
        return result;
    }
    return value;
}
const VARIABLE_REGEXP = /\$\{(.*?)\}/g;
function normalizeEnv(isWindows, originalEnv) {
    if (isWindows) {
        const env = Object.create(null);
        Object.keys(originalEnv).forEach(key => {
            env[key.toLowerCase()] = originalEnv[key];
        });
        return env;
    }
    return originalEnv;
}
function resolveString(replace, value) {
    // loop through all variables occurrences in 'value'
    return value.replace(VARIABLE_REGEXP, evaluateSingleVariable.bind(undefined, replace));
}
function evaluateSingleVariable(replace, match, variable) {
    // try to separate variable arguments from variable name
    let argument;
    const parts = variable.split(':');
    if (parts.length > 1) {
        variable = parts[0];
        argument = parts[1];
    }
    return replace(match, variable, argument);
}
function replaceWithContext(isWindows, context, match, variable, argument) {
    switch (variable) {
        case 'env':
        case 'localEnv':
            return lookupValue(isWindows, context.env, argument, match, context.configFile);
        case 'localWorkspaceFolder':
            return context.localWorkspaceFolder !== undefined ? context.localWorkspaceFolder : match;
        case 'localWorkspaceFolderBasename':
            return context.localWorkspaceFolder !== undefined ? (isWindows ? path.win32 : path.posix).basename(context.localWorkspaceFolder) : match;
        case 'containerWorkspaceFolder':
            return context.containerWorkspaceFolder !== undefined ? context.containerWorkspaceFolder : match;
        case 'containerWorkspaceFolderBasename':
            return context.containerWorkspaceFolder !== undefined ? path.posix.basename(context.containerWorkspaceFolder) : match;
        default:
            return match;
    }
}
function replaceContainerEnv(isWindows, configFile, containerEnvObj, match, variable, argument) {
    switch (variable) {
        case 'containerEnv':
            return lookupValue(isWindows, containerEnvObj, argument, match, configFile);
        default:
            return match;
    }
}
function lookupValue(isWindows, envObj, argument, match, configFile) {
    if (argument) {
        if (isWindows) {
            argument = argument.toLowerCase();
        }
        const env = envObj[argument];
        if (typeof env === 'string') {
            return env;
        }
        // For `env` we should do the same as a normal shell does - evaluates missing envs to an empty string #46436
        return '';
    }
    throw new errors_1.ContainerError({
        description: `'${match}'${configFile ? ` in ${path.posix.basename(configFile.path)}` : ''} can not be resolved because no environment variable name is given.`
    });
}
