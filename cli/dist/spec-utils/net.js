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
exports.httpGet = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
function httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const httpx = url.startsWith('https:') ? https : http;
        let requestOptions = undefined;
        if (Object.keys(headers).length > 0) {
            const parsedUrl = new URL(url);
            requestOptions = {
                'headers': headers,
                'host': parsedUrl.host,
                'path': parsedUrl.pathname,
            };
        }
        const req = httpx.get(requestOptions !== null && requestOptions !== void 0 ? requestOptions : url, res => {
            var _a;
            if (res.statusCode < 200 || res.statusCode > 299) {
                // Redirect
                if (res.statusCode === 302) {
                    const location = (_a = res.headers) === null || _a === void 0 ? void 0 : _a.location;
                    if (location) {
                        resolve(httpGet(location, headers));
                    }
                }
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
            else {
                res.on('error', reject);
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            }
        });
        req.on('error', reject);
    });
}
exports.httpGet = httpGet;
