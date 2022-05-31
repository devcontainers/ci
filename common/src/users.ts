interface User {
	name: string;
	// omitted password
	uid: string;
	gid: string;
	// omitted GECOS,
	// omitted home dir
	// omitted login shell
}
export function parsePasswd(input: string): User[] {
	const result: User[] = [];
	const lines = input.split('\n');
	for (const line of lines) {
		const parts = line.split(':');
		const user: User = {
			name: parts[0],
			uid: parts[2],
			gid: parts[3],
		};
		result.push(user);
	}
	return result;
}

interface Group {
	name: string;
	// omitted password
	gid: string;
	users: string[];
}

export function parseGroup(input: string): Group[] {
	const result: Group[] = [];
	const lines = input.split('\n');
	for (const line of lines) {
		const parts = line.split(':');
		const group: Group = {
			name: parts[0],
			gid: parts[2],
			users: parts[3] ? parts[3].split(',') : [],
		};
		result.push(group);
	}
	return result;
}
