import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'

import { loggerMiddleware } from '../../src/middleware/logger';

describe('Test logger middleware', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('logger', async () => {

        const req = {
            method: 'GET',
            path: '/test'
        };
        const resp = {};
        let called = false;
        const next = () => {
            called = true;
        };

        loggerMiddleware(req as any, resp as any, next);

        expect(called).to.be.true;
        
        
    });

});
