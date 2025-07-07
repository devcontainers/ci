import { ExecFunction } from './exec';
export declare function isSkopeoInstalled(exec: ExecFunction): Promise<boolean>;
export declare function copyImage(exec: ExecFunction, all: boolean, source: string, dest: string): Promise<void>;
