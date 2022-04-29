export function parsePasswd(input) {
    const result = [];
    const lines = input.split('\n');
    for (const line of lines) {
        const parts = line.split(':');
        const user = {
            name: parts[0],
            uid: parts[2],
            gid: parts[3]
        };
        result.push(user);
    }
    return result;
}
export function parseGroup(input) {
    const result = [];
    const lines = input.split('\n');
    for (const line of lines) {
        const parts = line.split(':');
        const group = {
            name: parts[0],
            gid: parts[2],
            users: parts[3] ? parts[3].split(',') : []
        };
        result.push(group);
    }
    return result;
}
