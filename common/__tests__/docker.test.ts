import {parseMount} from '../src/docker';

describe('parseMount', () => {
	test('handles type,src,dst', () => {
		const input = 'type=bind,src=/my/source,dst=/my/dest';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});
	test('handles type,source,destination', () => {
		const input = 'type=bind,source=/my/source,destination=/my/dest';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});
	test('handles type,source,target', () => {
		const input = 'type=bind,source=/my/source,target=/my/dest';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});

	test('throws on unexpected option', () => {
		const input = 'type=bind,source=/my/source,target=/my/dest,made-up';
		const action = () => parseMount(input);
		expect(action).toThrow("Unhandled mount option 'made-up'");
	});

	test('ignores readonly', () => {
		const input = 'type=bind,source=/my/source,target=/my/dest,readonly';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});
	test('ignores ro', () => {
		const input = 'type=bind,source=/my/source,target=/my/dest,ro';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});
	test('ignores readonly with value', () => {
		const input = 'type=bind,source=/my/source,target=/my/dest,readonly=false';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});
	test('ignores ro with value', () => {
		const input = 'type=bind,source=/my/source,target=/my/dest,ro=0';
		const result = parseMount(input);
		expect(result.type).toBe('bind');
		expect(result.source).toBe('/my/source');
		expect(result.target).toBe('/my/dest');
	});
});
