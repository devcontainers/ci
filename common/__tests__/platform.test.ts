import {platformToTagSuffix, buildImageNames, mergeMultiPlatformImages} from '../src/platform';

describe('platformToTagSuffix', () => {
	test('converts linux/amd64', () => {
		expect(platformToTagSuffix('linux/amd64')).toBe('linux-amd64');
	});

	test('converts linux/arm64', () => {
		expect(platformToTagSuffix('linux/arm64')).toBe('linux-arm64');
	});

	test('handles multiple slashes (linux/arm/v7)', () => {
		expect(platformToTagSuffix('linux/arm/v7')).toBe('linux-arm-v7');
	});

	test('returns input unchanged when no slashes', () => {
		expect(platformToTagSuffix('linux-amd64')).toBe('linux-amd64');
	});

	test('returns empty string for empty input', () => {
		expect(platformToTagSuffix('')).toBe('');
	});
});

describe('buildImageNames', () => {
	test('single tag without platformSuffix', () => {
		expect(buildImageNames('img', ['v1'])).toEqual(['img:v1']);
	});

	test('single tag with platformSuffix', () => {
		expect(buildImageNames('img', ['v1'], 'linux-amd64')).toEqual([
			'img:v1-linux-amd64',
		]);
	});

	test('multiple tags without platformSuffix', () => {
		expect(buildImageNames('img', ['v1', 'latest'])).toEqual([
			'img:v1',
			'img:latest',
		]);
	});

	test('multiple tags with platformSuffix', () => {
		expect(
			buildImageNames('img', ['v1', 'latest'], 'linux-amd64'),
		).toEqual(['img:v1-linux-amd64', 'img:latest-linux-amd64']);
	});

	test('empty tags array', () => {
		expect(buildImageNames('img', [])).toEqual([]);
	});

	test('undefined platformSuffix explicitly passed', () => {
		expect(buildImageNames('img', ['v1'], undefined)).toEqual(['img:v1']);
	});
});

describe('mergeMultiPlatformImages', () => {
	test('derives suffixes from standard platform format and calls createFn', async () => {
		const createFn = jest.fn<Promise<boolean>, [string, string, string[]]>()
			.mockResolvedValue(true);
		const log = jest.fn();

		const result = await mergeMultiPlatformImages('img', ['v1', 'latest'], 'linux/amd64,linux/arm64', createFn, log);

		expect(createFn).toHaveBeenCalledTimes(2);
		expect(createFn).toHaveBeenNthCalledWith(1, 'img', 'v1', ['linux-amd64', 'linux-arm64']);
		expect(createFn).toHaveBeenNthCalledWith(2, 'img', 'latest', ['linux-amd64', 'linux-arm64']);
		expect(result).toBe(true);
	});

	test('returns false and stops on first createFn failure', async () => {
		const createFn = jest.fn<Promise<boolean>, [string, string, string[]]>()
			.mockResolvedValueOnce(false);
		const log = jest.fn();

		const result = await mergeMultiPlatformImages('img', ['v1', 'latest'], 'linux/amd64,linux/arm64', createFn, log);

		expect(result).toBe(false);
		expect(createFn).toHaveBeenCalledTimes(1);
	});

	test('logs a message for each tag', async () => {
		const createFn = jest.fn<Promise<boolean>, [string, string, string[]]>()
			.mockResolvedValue(true);
		const log = jest.fn();

		await mergeMultiPlatformImages('img', ['v1', 'latest'], 'linux/amd64,linux/arm64', createFn, log);

		expect(log).toHaveBeenCalledTimes(2);
		expect(log).toHaveBeenNthCalledWith(1, "Creating multi-arch manifest for 'img:v1'...");
		expect(log).toHaveBeenNthCalledWith(2, "Creating multi-arch manifest for 'img:latest'...");
	});

	test('handles whitespace around commas in platforms', async () => {
		const createFn = jest.fn<Promise<boolean>, [string, string, string[]]>()
			.mockResolvedValue(true);
		const log = jest.fn();

		await mergeMultiPlatformImages('img', ['v1'], 'linux/amd64 , linux/arm64', createFn, log);

		expect(createFn).toHaveBeenCalledWith('img', 'v1', ['linux-amd64', 'linux-arm64']);
	});
});
