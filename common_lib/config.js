import * as path from 'path';
import * as fs from 'fs';
import * as jsoncParser from 'jsonc-parser';
const { readFile } = fs.promises;
export async function loadFromFile(filepath) {
    const jsonContent = await readFile(filepath);
    return loadFromString(jsonContent.toString());
}
export function loadFromString(content) {
    const config = jsoncParser.parse(content);
    return config;
}
export function getWorkspaceFolder(config, repoPath) {
    // TODO - need to check workspaceMount/workspaceFolder to set the source mount (https://github.com/stuartleeks/devcontainer-build-run/issues/66)
    // // https://code.visualstudio.com/docs/remote/containers-advanced#_changing-the-default-source-code-mount
    // if (config.workspaceFolder) {
    // 	return config.workspaceFolder
    // }
    return path.join('/workspaces', path.basename(repoPath));
}
export function getRemoteUser(config) {
    // https://code.visualstudio.com/docs/remote/containers-advanced#_specifying-a-user-for-vs-code
    return config.remoteUser ?? 'root';
}
export function getDockerfile(config) {
    return config.build?.dockerfile ?? config.dockerFile;
}
export function getContext(config) {
    return config.build?.context ?? config.context;
}
