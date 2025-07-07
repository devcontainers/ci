interface User {
    name: string;
    uid: string;
    gid: string;
}
export declare function parsePasswd(input: string): User[];
interface Group {
    name: string;
    gid: string;
    users: string[];
}
export declare function parseGroup(input: string): Group[];
export {};
