"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const spies = {
    log: jest.spyOn(global.console, 'log'),
    info: jest.spyOn(global.console, 'info'),
    error: jest.spyOn(global.console, 'error'),
    warn: jest.spyOn(global.console, 'warn'),
};
afterEach(() => {
    Object.keys(spies).forEach((spy) => {
        spies[spy].mockReset();
    });
});
afterAll(() => {
    Object.keys(spies).forEach((spy) => {
        spies[spy].mockReset();
        spies[spy].mockRestore();
    });
});
test('Metrics with no layers defaults to console', () => {
    const m = new index_1.Metrics();
    expect(m.layers).toHaveLength(1);
});
//# sourceMappingURL=metrics.js.map