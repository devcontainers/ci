import { Event } from './event';
export declare enum LogLevel {
    Trace = 1,
    Debug = 2,
    Info = 3,
    Warning = 4,
    Error = 5,
    Critical = 6,
    Off = 7
}
export declare type LogFormat = 'text' | 'json';
declare const logLevelMap: {
    info: LogLevel;
    debug: LogLevel;
    trace: LogLevel;
};
declare type logLevelString = keyof typeof logLevelMap;
export declare function mapLogLevel(text: logLevelString): LogLevel;
export declare function reverseMapLogLevel(level: LogLevel): "info" | "debug" | "trace";
export declare type LogEvent = {
    type: 'text' | 'raw' | 'start' | 'stop' | 'progress';
    channel?: string;
} & ({
    type: 'text' | 'raw' | 'start';
    level: LogLevel;
    timestamp: number;
    text: string;
} | {
    type: 'stop';
    level: LogLevel;
    timestamp: number;
    text: string;
    startTimestamp: number;
} | {
    type: 'progress';
    name: string;
    status: 'running' | 'succeeded' | 'failed';
    stepDetail?: string;
});
export interface LogHandler {
    event(e: LogEvent): void;
    dimensions?: LogDimensions;
    onDidChangeDimensions?: Event<LogDimensions>;
}
export interface Log {
    write(text: string, level?: LogLevel): void;
    raw(text: string, level?: LogLevel): void;
    start(text: string, level?: LogLevel): number;
    stop(text: string, start: number, level?: LogLevel): void;
    event(e: LogEvent): void;
    dimensions?: LogDimensions;
    onDidChangeDimensions?: Event<LogDimensions>;
}
export interface LogDimensions {
    columns: number;
    rows: number;
}
export declare const nullLog: Log;
export declare const terminalEscapeSequences: RegExp;
export declare function createCombinedLog(logs: LogHandler[], header?: string): LogHandler;
export declare function createPlainLog(write: (text: string) => void, getLogLevel: () => LogLevel): LogHandler;
export declare function createTerminalLog(write: (text: string) => void, _getLogLevel: () => LogLevel, _sessionStart: Date): LogHandler;
export declare function createJSONLog(write: (text: string) => void, _getLogLevel: () => LogLevel, _sessionStart: Date): LogHandler;
export declare function makeLog(log: LogHandler, defaultLogEventLevel?: LogLevel): Log;
export declare function logEventToTerminalText(e: LogEvent, logLevel: LogLevel, startTimestamp: number): string | undefined;
export declare const stopColor = "38;2;143;99;79";
export declare const startColor = "38;2;99;143;79";
export declare const timestampColor = "38;2;99;143;79";
export declare const numberColor = "38;2;86;156;214";
export declare function color(color: string, str: string): string;
export declare function colorize(text: string): string;
export declare function toErrorText(str: string): string;
export declare function toWarningText(str: string): string;
export {};
