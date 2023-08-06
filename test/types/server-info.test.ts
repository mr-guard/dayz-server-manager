import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { isSameServerInfo } from '../../src/types/server-info';

describe('Test server info types', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('ServerInfo', () => {
        expect(isSameServerInfo(null!, null!)).to.be.true;
        expect(isSameServerInfo(null!, {} as any)).to.be.false;
        expect(isSameServerInfo(
            {
                name: '123',
                port: 1,
                worldName: 'world',
                password: true,
                battleye: true,
                maxPlayers: 60,
            },
            {
                name: '123',
                port: 1,
                worldName: 'world',
                password: true,
                battleye: true,
                maxPlayers: 60,
            },
        )).to.be.true;
        expect(isSameServerInfo(
            {
                name: '123',
                port: 1,
                worldName: 'world',
                password: true,
                battleye: true,
                maxPlayers: 60,
            },
            {
                name: 'abc',
                port: 1,
                worldName: 'world',
                password: true,
                battleye: true,
                maxPlayers: 60,
            },
        )).to.be.false;
    });
});