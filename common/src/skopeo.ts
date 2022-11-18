import {ExecFunction} from './exec';

export async function isSkopeoInstalled(
	exec: ExecFunction,
): Promise<boolean> {
	const {exitCode} = await exec('skopeo', ['--help'], {silent: true});
	return exitCode === 0;
}

export async function copyImage(
	exec: ExecFunction,
	all: boolean,
	source: string,
	dest: string,
): Promise<void> {
	const args = ['copy'];
	if (all) {
		args.push('--all');
	}
	args.push(source, dest);

	const {exitCode} = await exec('skopeo', args, {});

	if (exitCode !== 0) {
		throw new Error(`skopeo copy failed with ${exitCode}`);
	}
}