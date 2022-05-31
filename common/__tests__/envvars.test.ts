import {populateDefaults, substituteValues} from '../src/envvars';

describe('substituteValues', () => {
	test('returns original string with no substitution placeholders', async () => {
		const input = 'This is a test';
		const result = await substituteValues(input);
		expect(result).toBe(input);
	});

	test("Handles 'env' substitution placeholders", async () => {
		process.env.TEST_ENV1 = 'TestEnvValue1';
		process.env.TEST_ENV2 = 'TestEnvValue2';
		const input = 'TEST_ENV1: ${env:TEST_ENV1}, TEST_ENV2: ${env:TEST_ENV2}';
		const result = await substituteValues(input);
		expect(result).toBe('TEST_ENV1: TestEnvValue1, TEST_ENV2: TestEnvValue2');
	});

	test("Handles 'Env' substitution placeholders", async () => {
		process.env.TEST_ENV1 = 'TestEnvValue1';
		process.env.TEST_ENV2 = 'TestEnvValue2';
		const input = 'TEST_ENV1: ${Env:TEST_ENV1}, TEST_ENV2: ${Env:TEST_ENV2}';
		const result = await substituteValues(input);
		expect(result).toBe('TEST_ENV1: TestEnvValue1, TEST_ENV2: TestEnvValue2');
	});

	test("ignores substitution placeholders that it doesn't understand", async () => {
		const input = 'TEST_ENV: ${nothingToSee:TEST_ENV}';
		const result = await substituteValues(input);
		expect(result).toBe(input);
	});
});

describe('populateDefaults', () => {
	test('returns original inputs when fully specified', () => {
		const input = ['TEST_ENV1=value1', 'TEST_ENV2=value2'];
		const result = populateDefaults(input);
		expect(result).toEqual(['TEST_ENV1=value1', 'TEST_ENV2=value2']);
	});

	test('adds process env value when set and input value not provided', () => {
		const input = ['TEST_ENV1', 'TEST_ENV2=value2'];
		process.env.TEST_ENV1 = 'TestEnvValue1';
		const result = populateDefaults(input);
		expect(result).toEqual(['TEST_ENV1=TestEnvValue1', 'TEST_ENV2=value2']);
	});

	test('skips value when process env value not set and input value not provided', () => {
		const input = ['TEST_ENV1', 'TEST_ENV2=value2'];
		delete process.env.TEST_ENV1;
		const result = populateDefaults(input);
		expect(result).toEqual(['TEST_ENV2=value2']);
	});
});
