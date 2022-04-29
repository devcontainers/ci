import * as core from '@actions/core';
import { errorToString } from '../../common/src/errors';
import { isDockerBuildXInstalled, buildImage, runContainer, pushImage } from './docker';
async function run() {
    const hasRunMain = core.getState('hasRunMain');
    if (hasRunMain === 'true') {
        return await runPost();
    }
    else {
        core.saveState('hasRunMain', 'true');
        return await runMain();
    }
}
async function runMain() {
    try {
        const buildXInstalled = await isDockerBuildXInstalled();
        if (!buildXInstalled) {
            core.setFailed('docker buildx not available: add a step to set up with docker/setup-buildx-action');
            return;
        }
        const checkoutPath = core.getInput('checkoutPath');
        const imageName = core.getInput('imageName', { required: true });
        const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
        const subFolder = core.getInput('subFolder');
        const runCommand = core.getInput('runCmd', { required: true });
        const envs = core.getMultilineInput('env');
        const cacheFrom = core.getMultilineInput('cacheFrom');
        const skipContainerUserIdUpdate = core.getBooleanInput('skipContainerUserIdUpdate');
        const buildImageName = await buildImage(imageName, imageTag, checkoutPath, subFolder, skipContainerUserIdUpdate, cacheFrom);
        if (buildImageName === '') {
            return;
        }
        if (!(await runContainer(buildImageName, imageTag, checkoutPath, subFolder, runCommand, envs))) {
            return;
        }
    }
    catch (error) {
        core.setFailed(errorToString(error));
    }
}
async function runPost() {
    const pushOption = valueOrDefault(core.getInput('push'), 'filter');
    const refFilterForPush = core.getMultilineInput('refFilterForPush');
    const eventFilterForPush = core.getMultilineInput('eventFilterForPush');
    if (pushOption === 'never') {
        core.info(`Image push skipped because 'push' is set to '${pushOption}'`);
        return;
    }
    if (pushOption === 'filter') {
        // https://docs.github.com/en/actions/reference/environment-variables#default-environment-variables
        const ref = process.env.GITHUB_REF;
        if (refFilterForPush.length !== 0 && // empty filter allows all
            !refFilterForPush.some(s => s === ref)) {
            core.info(`Image push skipped because GITHUB_REF (${ref}) is not in refFilterForPush`);
            return;
        }
        const eventName = process.env.GITHUB_EVENT_NAME;
        if (eventFilterForPush.length !== 0 && // empty filter allows all
            !eventFilterForPush.some(s => s === eventName)) {
            core.info(`Image push skipped because GITHUB_EVENT_NAME (${eventName}) is not in eventFilterForPush`);
            return;
        }
    }
    else if (pushOption !== 'always') {
        core.setFailed(`Unexpected push value ('${pushOption})'`);
        return;
    }
    const imageName = core.getInput('imageName', { required: true });
    const imageTag = emptyStringAsUndefined(core.getInput('imageTag'));
    core.info(`Pushing image ''${imageName}:${imageTag ?? 'latest'}...`);
    await pushImage(imageName, imageTag);
}
function valueOrDefault(value, defaultValue) {
    if (!value || value === '') {
        return defaultValue;
    }
    return value;
}
function emptyStringAsUndefined(value) {
    if (value === '') {
        return undefined;
    }
    return value;
}
run();
