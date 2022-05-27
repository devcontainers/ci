import {parsePasswd, parseGroup} from '../src/users';

describe('parsePasswd', () => {
	test('parses lines correctly', async () => {
		const input = `root:x:0:0:root:/root:/bin/bash
stuart:x:1000:1001:,,,:/home/stuart:/bin/bash`;
		const result = await parsePasswd(input);
		expect(result.length).toBe(2);
		expect(result[0].name).toBe('root');
		expect(result[0].uid).toBe('0');
		expect(result[0].gid).toBe('0');
		expect(result[1].name).toBe('stuart');
		expect(result[1].uid).toBe('1000');
		expect(result[1].gid).toBe('1001');
	});
});

describe('parseGroup', () => {
	test('parses lines correctly', async () => {
		const input = `root:x:0:
test:x:123:stuart
test2:x:1000:stuart,emilie`;
		const result = await parseGroup(input);
		expect(result.length).toBe(3);
		expect(result[0].name).toBe('root');
		expect(result[0].gid).toBe('0');
		expect(result[0].users).toStrictEqual([]);
		expect(result[1].name).toBe('test');
		expect(result[1].gid).toBe('123');
		expect(result[1].users).toStrictEqual(['stuart']);
		expect(result[2].name).toBe('test2');
		expect(result[2].gid).toBe('1000');
		expect(result[2].users).toStrictEqual(['stuart', 'emilie']);
	});
});
