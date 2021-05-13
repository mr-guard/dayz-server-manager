import { ImportMock } from "ts-mock-imports";
import { disableConsole, enableConsole } from "../util";

describe('Test class ManagerController', () => {

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('ManagerController', () => {
    });
});