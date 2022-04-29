/// <reference types="node" />
import { Log } from './log';
export declare function request(options: {
    type: string;
    url: string;
    headers: Record<string, string>;
    data?: Buffer;
}, output?: Log): Promise<Buffer>;
