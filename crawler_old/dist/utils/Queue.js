"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    constructor(maxLength) {
        this.values = [];
        this.maxLength = maxLength;
    }
    push(value) {
        this.values.push(value);
    }
    pop() {
        if (this.values.length === 0) {
            throw new Error('Queue is empty');
        }
        return this.values.splice(0, 1)[0];
    }
    len() {
        return this.values.length;
    }
    isFull() {
        if (!this.maxLength) {
            return false;
        }
        return this.maxLength <= this.values.length;
    }
    isEmpty() {
        return this.values.length === 0;
    }
}
exports.default = Queue;
//# sourceMappingURL=Queue.js.map