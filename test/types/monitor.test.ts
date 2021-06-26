import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { ServerState, SystemReport, UsageItem } from '../../src/types/monitor';

describe('Test monitor types', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('UsageItem', () => {
        const item = new UsageItem();
        expect(item).to.be.not.undefined;
    });

    it('SystemReport', () => {
        const item = new SystemReport();
        expect(item).to.be.not.undefined;
    });

    it('SystemReport-format', () => {
        const item = new SystemReport();
        item.serverState = ServerState.STARTED;
        expect(item.format()).to.be.not.empty;
    });
});