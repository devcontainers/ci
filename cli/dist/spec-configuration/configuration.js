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
exports.getDockerComposeFilePaths = exports.getDockerfile = exports.getDockerfilePath = exports.isDockerFileConfig = exports.resolveConfigFilePath = exports.getConfigFilePath = exports.updateFromOldProperties = void 0;
const path = __importStar(require("path"));
const configurationCommonUtils_1 = require("./configurationCommonUtils");
const editableFiles_1 = require("./editableFiles");
function updateFromOldProperties(original) {
    // https://github.com/microsoft/dev-container-spec/issues/1
    if (!(original.extensions || original.settings || original.devPort !== undefined)) {
        return original;
    }
    const copy = { ...original };
    const customizations = copy.customizations || (copy.customizations = {});
    const vscode = customizations.vscode || (customizations.vscode = {});
    if (copy.extensions) {
        vscode.extensions = (vscode.extensions || []).concat(copy.extensions);
        delete copy.extensions;
    }
    if (copy.settings) {
        vscode.settings = {
            ...copy.settings,
            ...(vscode.settings || {}),
        };
        delete copy.settings;
    }
    if (copy.devPort !== undefined && vscode.devPort === undefined) {
        vscode.devPort = copy.devPort;
        delete copy.devPort;
    }
    return copy;
}
exports.updateFromOldProperties = updateFromOldProperties;
function getConfigFilePath(cliHost, config, relativeConfigFilePath) {
    return resolveConfigFilePath(cliHost, config.configFilePath, relativeConfigFilePath);
}
exports.getConfigFilePath = getConfigFilePath;
function resolveConfigFilePath(cliHost, configFilePath, relativeConfigFilePath) {
    const folder = (0, configurationCommonUtils_1.parentURI)(configFilePath);
    return configFilePath.with({
        path: path.posix.resolve(folder.path, (cliHost.platform === 'win32' && configFilePath.scheme !== editableFiles_1.RemoteDocuments.scheme) ? (path.win32.isAbsolute(relativeConfigFilePath) ? '/' : '') + relativeConfigFilePath.replace(/\\/g, '/') : relativeConfigFilePath)
    });
}
exports.resolveConfigFilePath = resolveConfigFilePath;
function isDockerFileConfig(config) {
    return 'dockerFile' in config || ('build' in config && 'dockerfile' in config.build);
}
exports.isDockerFileConfig = isDockerFileConfig;
function getDockerfilePath(cliHost, config) {
    return getConfigFilePath(cliHost, config, getDockerfile(config));
}
exports.getDockerfilePath = getDockerfilePath;
function getDockerfile(config) {
    return 'dockerFile' in config ? config.dockerFile : config.build.dockerfile;
}
exports.getDockerfile = getDockerfile;
async function getDockerComposeFilePaths(cliHost, config, envForComposeFile, cwdForDefaultFiles) {
    if (Array.isArray(config.dockerComposeFile)) {
        if (config.dockerComposeFile.length) {
            return config.dockerComposeFile.map(composeFile => (0, configurationCommonUtils_1.uriToFsPath)(getConfigFilePath(cliHost, config, composeFile), cliHost.platform));
        }
    }
    else if (typeof config.dockerComposeFile === 'string') {
        return [(0, configurationCommonUtils_1.uriToFsPath)(getConfigFilePath(cliHost, config, config.dockerComposeFile), cliHost.platform)];
    }
    if (cwdForDefaultFiles) {
        const envComposeFile = envForComposeFile === null || envForComposeFile === void 0 ? void 0 : envForComposeFile.COMPOSE_FILE;
        if (envComposeFile) {
            return envComposeFile.split(cliHost.path.delimiter)
                .map(composeFile => cliHost.path.resolve(cwdForDefaultFiles, composeFile));
        }
        try {
            const envPath = cliHost.path.join(cwdForDefaultFiles, '.env');
            const buffer = await cliHost.readFile(envPath);
            const match = /^COMPOSE_FILE=(.+)$/m.exec(buffer.toString());
            const envFileComposeFile = match && match[1].trim();
            if (envFileComposeFile) {
                return envFileComposeFile.split(cliHost.path.delimiter)
                    .map(composeFile => cliHost.path.resolve(cwdForDefaultFiles, composeFile));
            }
        }
        catch (err) {
            if (!(err && (err.code === 'ENOENT' || err.code === 'EISDIR'))) {
                throw err;
            }
        }
        const defaultFiles = [cliHost.path.resolve(cwdForDefaultFiles, 'docker-compose.yml')];
        const override = cliHost.path.resolve(cwdForDefaultFiles, 'docker-compose.override.yml');
        if (await cliHost.isFile(override)) {
            defaultFiles.push(override);
        }
        return defaultFiles;
    }
    return [];
}
exports.getDockerComposeFilePaths = getDockerComposeFilePaths;
