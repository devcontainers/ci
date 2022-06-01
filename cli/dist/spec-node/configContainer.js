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
exports.readDevContainerConfigFile = exports.resolve = exports.getPossibleDevContainerPaths = void 0;
const path = __importStar(require("path"));
const jsonc = __importStar(require("jsonc-parser"));
const singleContainer_1 = require("./singleContainer");
const dockerCompose_1 = require("./dockerCompose");
const utils_1 = require("./utils");
const variableSubstitution_1 = require("../spec-common/variableSubstitution");
const errors_1 = require("../spec-common/errors");
const workspaces_1 = require("../spec-utils/workspaces");
const configurationCommonUtils_1 = require("../spec-configuration/configurationCommonUtils");
const configuration_1 = require("../spec-configuration/configuration");
var configurationCommonUtils_2 = require("../spec-configuration/configurationCommonUtils");
Object.defineProperty(exports, "getPossibleDevContainerPaths", { enumerable: true, get: function () { return configurationCommonUtils_2.getWellKnownDevContainerPaths; } });
async function resolve(params, configFile, overrideConfigFile, idLabels) {
    if (configFile && !/\/\.?devcontainer\.json$/.test(configFile.path)) {
        throw new Error(`Filename must be devcontainer.json or .devcontainer.json (${(0, utils_1.uriToFsPath)(configFile, params.common.cliHost.platform)}).`);
    }
    const parsedAuthority = params.parsedAuthority;
    if (!parsedAuthority || (0, utils_1.isDevContainerAuthority)(parsedAuthority)) {
        return resolveWithLocalFolder(params, parsedAuthority, configFile, overrideConfigFile, idLabels);
    }
    else {
        throw new Error(`Unexpected authority: ${JSON.stringify(parsedAuthority)}`);
    }
}
exports.resolve = resolve;
async function resolveWithLocalFolder(params, parsedAuthority, configFile, overrideConfigFile, idLabels) {
    const { common, workspaceMountConsistencyDefault } = params;
    const { cliHost, output } = common;
    const cwd = cliHost.cwd; // Can be inside WSL.
    const workspace = parsedAuthority && (0, workspaces_1.workspaceFromPath)(cliHost.path, (0, workspaces_1.isWorkspacePath)(parsedAuthority.hostPath) ? cliHost.path.join(cwd, path.basename(parsedAuthority.hostPath)) : cwd);
    const configPath = configFile ? configFile : workspace
        ? (await (0, configurationCommonUtils_1.getDevContainerConfigPathIn)(cliHost, workspace.configFolderPath)
            || (overrideConfigFile ? (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath) : undefined))
        : overrideConfigFile;
    const configs = configPath && await readDevContainerConfigFile(cliHost, workspace, configPath, params.mountWorkspaceGitRoot, output, workspaceMountConsistencyDefault, overrideConfigFile) || undefined;
    if (!configs) {
        if (configPath || workspace) {
            throw new errors_1.ContainerError({ description: `Dev container config (${(0, utils_1.uriToFsPath)(configPath || (0, configurationCommonUtils_1.getDefaultDevContainerConfigPath)(cliHost, workspace.configFolderPath), cliHost.platform)}) not found.` });
        }
        else {
            throw new errors_1.ContainerError({ description: `No dev container config and no workspace found.` });
        }
    }
    const config = configs.config;
    await (0, utils_1.runUserCommand)({ ...params, common: { ...common, output: common.postCreate.output } }, config.initializeCommand, common.postCreate.onDidInput);
    let result;
    if ((0, utils_1.isDockerFileConfig)(config) || 'image' in config) {
        result = await (0, singleContainer_1.openDockerfileDevContainer)(params, config, configs.workspaceConfig, idLabels);
    }
    else if ('dockerComposeFile' in config) {
        if (!workspace) {
            throw new errors_1.ContainerError({ description: `A Dev Container using Docker Compose requires a workspace folder.` });
        }
        result = await (0, dockerCompose_1.openDockerComposeDevContainer)(params, workspace, config, idLabels);
    }
    else {
        throw new errors_1.ContainerError({ description: `Dev container config (${config.configFilePath}) is missing one of "image", "dockerFile" or "dockerComposeFile" properties.` });
    }
    return result;
}
async function readDevContainerConfigFile(cliHost, workspace, configFile, mountWorkspaceGitRoot, output, consistency, overrideConfigFile) {
    const documents = (0, utils_1.createDocuments)(cliHost);
    const content = await documents.readDocument(overrideConfigFile !== null && overrideConfigFile !== void 0 ? overrideConfigFile : configFile);
    if (!content) {
        return undefined;
    }
    const raw = jsonc.parse(content);
    const updated = raw && (0, configuration_1.updateFromOldProperties)(raw);
    if (!updated || typeof updated !== 'object' || Array.isArray(updated)) {
        throw new errors_1.ContainerError({ description: `Dev container config (${(0, utils_1.uriToFsPath)(configFile, cliHost.platform)}) must contain a JSON object literal.` });
    }
    const workspaceConfig = await (0, utils_1.getWorkspaceConfiguration)(cliHost, workspace, updated, mountWorkspaceGitRoot, output, consistency);
    const config = (0, variableSubstitution_1.substitute)({
        platform: cliHost.platform,
        localWorkspaceFolder: workspace === null || workspace === void 0 ? void 0 : workspace.rootFolderPath,
        containerWorkspaceFolder: workspaceConfig.workspaceFolder,
        configFile,
        env: cliHost.env,
    }, updated);
    if (typeof config.workspaceFolder === 'string') {
        workspaceConfig.workspaceFolder = config.workspaceFolder;
    }
    if ('workspaceMount' in config) {
        workspaceConfig.workspaceMount = config.workspaceMount;
    }
    config.configFilePath = configFile;
    return {
        config,
        workspaceConfig,
    };
}
exports.readDevContainerConfigFile = readDevContainerConfigFile;
