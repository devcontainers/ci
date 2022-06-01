"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultEventEmitter = exports.NodeEventEmitter = void 0;
const events_1 = require("events");
class NodeEventEmitter {
    constructor(register) {
        this.register = register;
        this.nodeEmitter = new events_1.EventEmitter();
        this.event = (listener) => {
            this.nodeEmitter.on('event', listener);
            if (this.register && this.nodeEmitter.listenerCount('event') === 1) {
                this.register.on();
            }
            return {
                dispose: () => {
                    if (this.register && this.nodeEmitter.listenerCount('event') === 1) {
                        this.register.off();
                    }
                    this.nodeEmitter.off('event', listener);
                }
            };
        };
    }
    fire(data) {
        this.nodeEmitter.emit('event', data);
    }
    dispose() {
        this.nodeEmitter.removeAllListeners();
    }
}
exports.NodeEventEmitter = NodeEventEmitter;
class ResultEventEmitter {
    constructor() {
        this.nodeEmitter = new events_1.EventEmitter();
        this.event = (listener) => {
            const wrapper = (e) => e.results.push(listener(e.data));
            this.nodeEmitter.on('event', wrapper);
            return {
                dispose: () => {
                    this.nodeEmitter.off('event', wrapper);
                }
            };
        };
    }
    fire(data) {
        const results = [];
        this.nodeEmitter.emit('event', {
            data,
            results,
        });
        return results;
    }
    dispose() {
        this.nodeEmitter.removeAllListeners();
    }
}
exports.ResultEventEmitter = ResultEventEmitter;
