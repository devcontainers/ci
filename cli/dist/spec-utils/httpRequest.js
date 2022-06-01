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
exports.request = void 0;
const follow_redirects_1 = require("follow-redirects");
const url = __importStar(require("url"));
const log_1 = require("./log");
function request(options, output) {
    return new Promise((resolve, reject) => {
        const parsed = new url.URL(options.url);
        const reqOptions = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.type,
            headers: options.headers,
        };
        const req = follow_redirects_1.https.request(reqOptions, res => {
            if (res.statusCode < 200 || res.statusCode > 299) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                if (output) {
                    output.write(`HTTP request failed with status code ${res.statusCode}: : ${res.statusMessage}`, log_1.LogLevel.Error);
                }
            }
            else {
                res.on('error', reject);
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            }
        });
        req.on('error', reject);
        if (options.data) {
            req.write(options.data);
        }
        req.end();
    });
}
exports.request = request;
