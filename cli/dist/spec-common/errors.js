"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerError = exports.toWarningText = exports.toErrorText = void 0;
var log_1 = require("../spec-utils/log");
Object.defineProperty(exports, "toErrorText", { enumerable: true, get: function () { return log_1.toErrorText; } });
Object.defineProperty(exports, "toWarningText", { enumerable: true, get: function () { return log_1.toWarningText; } });
class ContainerError extends Error {
    constructor(info) {
        var _a;
        super(info.originalError && info.originalError.message || info.description);
        this.manageContainer = false;
        this.actions = [];
        this.data = {};
        Object.assign(this, info);
        if ((_a = this.originalError) === null || _a === void 0 ? void 0 : _a.stack) {
            this.stack = this.originalError.stack;
        }
    }
}
exports.ContainerError = ContainerError;
