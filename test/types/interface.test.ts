import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { Request, Response } from '../../src/types/interface';

describe('Test interface types', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('Request', () => {
        const item = new Request();
        expect(item).to.be.not.undefined;
    });

    it('Response', () => {
        const item = new Response(200, '');
        expect(item).to.be.not.undefined;
    });

});