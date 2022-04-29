import { ResolverResult, DockerResolverParameters, BindMountConsistency } from './utils';
import { Workspace } from '../spec-utils/workspaces';
import { URI } from 'vscode-uri';
import { CLIHost } from '../spec-common/commonUtils';
import { Log } from '../spec-utils/log';
import { DevContainerConfig } from '../spec-configuration/configuration';
export { getWellKnownDevContainerPaths as getPossibleDevContainerPaths } from '../spec-configuration/configurationCommonUtils';
export declare function resolve(params: DockerResolverParameters, configFile: URI | undefined, overrideConfigFile: URI | undefined, idLabels: string[]): Promise<ResolverResult>;
export declare function readDevContainerConfigFile(cliHost: CLIHost, workspace: Workspace | undefined, configFile: URI, mountWorkspaceGitRoot: boolean, output: Log, consistency?: BindMountConsistency, overrideConfigFile?: URI): Promise<{
    config: DevContainerConfig;
    workspaceConfig: import("./utils").WorkspaceConfiguration;
} | undefined>;
