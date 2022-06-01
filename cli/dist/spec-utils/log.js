"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWarningText = exports.toErrorText = exports.colorize = exports.color = exports.numberColor = exports.timestampColor = exports.startColor = exports.stopColor = exports.logEventToTerminalText = exports.makeLog = exports.createJSONLog = exports.createTerminalLog = exports.createPlainLog = exports.createCombinedLog = exports.terminalEscapeSequences = exports.nullLog = exports.reverseMapLogLevel = exports.mapLogLevel = exports.LogLevel = void 0;
const os = __importStar(require("os"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    LogLevel[LogLevel["Info"] = 3] = "Info";
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    LogLevel[LogLevel["Error"] = 5] = "Error";
    LogLevel[LogLevel["Critical"] = 6] = "Critical";
    LogLevel[LogLevel["Off"] = 7] = "Off";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
const logLevelMap = {
    info: LogLevel.Info,
    debug: LogLevel.Debug,
    trace: LogLevel.Trace,
};
const logLevelReverseMap = Object.keys(logLevelMap)
    .reduce((arr, cur) => {
    arr[logLevelMap[cur]] = cur;
    return arr;
}, []);
function mapLogLevel(text) {
    return logLevelMap[text] || LogLevel.Info;
}
exports.mapLogLevel = mapLogLevel;
function reverseMapLogLevel(level) {
    return logLevelReverseMap[level] || LogLevel.Info;
}
exports.reverseMapLogLevel = reverseMapLogLevel;
exports.nullLog = {
    write: () => undefined,
    raw: () => undefined,
    start: () => Date.now(),
    stop: () => undefined,
    event: () => undefined,
};
exports.terminalEscapeSequences = /(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]/g; // https://stackoverflow.com/questions/14693701/how-can-i-remove-the-ansi-escape-sequences-from-a-string-in-python/33925425#33925425
function createCombinedLog(logs, header) {
    let sendHeader = !!header;
    return {
        event: e => {
            if (sendHeader) {
                sendHeader = false;
                logs.forEach(log => log.event({
                    type: 'text',
                    level: LogLevel.Info,
                    timestamp: Date.now(),
                    text: header,
                }));
            }
            logs.forEach(log => log.event(e));
        }
    };
}
exports.createCombinedLog = createCombinedLog;
function createPlainLog(write, getLogLevel) {
    return {
        event(e) {
            const text = logEventToFileText(e, getLogLevel());
            if (text) {
                write(text);
            }
        },
    };
}
exports.createPlainLog = createPlainLog;
function createTerminalLog(write, _getLogLevel, _sessionStart) {
    return {
        event(e) {
            const text = logEventToTerminalText(e, _getLogLevel(), _sessionStart.getTime());
            if (text) {
                write(text);
            }
        }
    };
}
exports.createTerminalLog = createTerminalLog;
function createJSONLog(write, _getLogLevel, _sessionStart) {
    return {
        event(e) {
            write(JSON.stringify(e) + '\n');
        }
    };
}
exports.createJSONLog = createJSONLog;
function makeLog(log, defaultLogEventLevel = LogLevel.Debug) {
    return {
        event: log.event,
        write(text, level = defaultLogEventLevel) {
            log.event({
                type: 'text',
                level,
                timestamp: Date.now(),
                text,
            });
        },
        raw(text, level = defaultLogEventLevel) {
            log.event({
                type: 'raw',
                level,
                timestamp: Date.now(),
                text,
            });
        },
        start(text, level = defaultLogEventLevel) {
            const timestamp = Date.now();
            log.event({
                type: 'start',
                level,
                timestamp,
                text,
            });
            return timestamp;
        },
        stop(text, startTimestamp, level = defaultLogEventLevel) {
            log.event({
                type: 'stop',
                level,
                timestamp: Date.now(),
                text,
                startTimestamp,
            });
        },
        get dimensions() {
            return log.dimensions;
        },
        onDidChangeDimensions: log.onDidChangeDimensions,
    };
}
exports.makeLog = makeLog;
function logEventToTerminalText(e, logLevel, startTimestamp) {
    if (!('level' in e) || e.level < logLevel) {
        return undefined;
    }
    switch (e.type) {
        case 'text': return `[${color(exports.timestampColor, `${e.timestamp - startTimestamp} ms`)}] ${toTerminalText(e.text)}`;
        case 'raw': return e.text;
        case 'start':
            if (LogLevel.Trace >= logLevel) {
                return `${color(exports.startColor, `[${e.timestamp - startTimestamp} ms] Start`)}: ${toTerminalText(e.text)}`;
            }
            return `[${color(exports.timestampColor, `${e.timestamp - startTimestamp} ms`)}] Start: ${toTerminalText(e.text)}`;
        case 'stop':
            if (LogLevel.Trace >= logLevel) {
                return `${color(exports.stopColor, `[${e.timestamp - startTimestamp} ms] Stop`)} (${e.timestamp - e.startTimestamp} ms): ${toTerminalText(e.text)}`;
            }
            return undefined;
        default: throw neverLogEventError(e);
    }
}
exports.logEventToTerminalText = logEventToTerminalText;
function toTerminalText(text) {
    return colorize(text)
        .replace(/\r?\n/g, '\r\n').replace(/(\r?\n)?$/, '\r\n');
}
function logEventToFileText(e, logLevel) {
    if (!('level' in e) || e.level < logLevel) {
        return undefined;
    }
    switch (e.type) {
        case 'text':
        case 'raw': return `[${new Date(e.timestamp).toISOString()}] ${toLogFileText(e.text)}`;
        case 'start': return `[${new Date(e.timestamp).toISOString()}] Start: ${toLogFileText(e.text)}`;
        case 'stop':
            if (LogLevel.Debug >= logLevel) {
                return `[${new Date(e.timestamp).toISOString()}] Stop (${e.timestamp - e.startTimestamp} ms): ${toLogFileText(e.text)}`;
            }
            return undefined;
        default: throw neverLogEventError(e);
    }
}
function toLogFileText(text) {
    return text.replace(exports.terminalEscapeSequences, '')
        .replace(/(\r?\n)?$/, os.EOL);
}
function neverLogEventError(e) {
    return new Error(`Unknown log event type: ${e.type}`);
}
// foreground 38;2;<r>;<g>;<b> (https://stackoverflow.com/questions/4842424/list-of-ansi-color-escape-sequences)
const red = '38;2;143;99;79';
const green = '38;2;99;143;79';
const blue = '38;2;86;156;214';
exports.stopColor = red;
exports.startColor = green;
exports.timestampColor = green;
exports.numberColor = blue;
function color(color, str) {
    return str.split('\n')
        .map(line => `[1m[${color}m${line}[39m[22m`)
        .join('\n');
}
exports.color = color;
function colorize(text) {
    let m;
    let lastIndex = 0;
    const fragments = [];
    exports.terminalEscapeSequences.lastIndex = 0;
    while (m = exports.terminalEscapeSequences.exec(text)) {
        fragments.push(colorizePlainText(text.substring(lastIndex, m.index)));
        fragments.push(m[0]);
        lastIndex = exports.terminalEscapeSequences.lastIndex;
    }
    fragments.push(colorizePlainText(text.substr(lastIndex)));
    return fragments.join('');
}
exports.colorize = colorize;
function colorizePlainText(text) {
    const num = /(?<=^|[^A-Za-z0-9_\-\.])[0-9]+(\.[0-9]+)*(?=$|[^A-Za-z0-9_\-\.])/g;
    let m;
    let lastIndex = 0;
    const fragments = [];
    while (m = num.exec(text)) {
        fragments.push(text.substring(lastIndex, m.index));
        fragments.push(color(exports.numberColor, m[0]));
        lastIndex = num.lastIndex;
    }
    fragments.push(text.substr(lastIndex));
    return fragments.join('');
}
function toErrorText(str) {
    return str.split(/\r?\n/)
        .map(line => `[1m[31m${line}[39m[22m`)
        .join('\r\n') + '\r\n';
}
exports.toErrorText = toErrorText;
function toWarningText(str) {
    return str.split(/\r?\n/)
        .map(line => `[1m[33m${line}[39m[22m`)
        .join('\r\n') + '\r\n';
}
exports.toWarningText = toWarningText;
