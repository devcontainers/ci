import * as core from '@actions/core';
import * as skopeo from '../../common/src/skopeo';
import {exec} from './exec';

export async function isSkopeoInstalled(): Promise<boolean> {
	return await skopeo.isSkopeoInstalled(exec);
}

export async function copyImage(
	all: boolean,
	source: string,
	dest: string,
): Promise<boolean> {
	core.startGroup('📌 Copying image...');
	try {
		await skopeo.copyImage(exec, all, source, dest);
		return true;
	} catch (error) {
		core.setFailed(error);
		return false;
	} finally {
		core.endGroup();
	}
}
