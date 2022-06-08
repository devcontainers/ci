import {exec} from '../src/exec';

describe('exec', () => {
	test('non-silent returns correct output', async () => {
		const result = await exec('bash', ['-c', 'echo hi'], {silent: false});
		console.log(result);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toStrictEqual('hi\n');
	});
	test('silent returns correct output', async () => {
		const result = await exec('bash', ['-c', 'echo hi'], {silent: true});
		console.log(result);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toStrictEqual('hi\n');
	});
});
