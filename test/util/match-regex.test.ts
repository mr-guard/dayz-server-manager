import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'

import { matchRegex } from '../../src/util/match-regex';

describe('Test match regex', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('match-regex', () => {

        const regex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

        const result = matchRegex(regex, `
            127.0.0.1 test 1234
            localhost asdf 1234
            127.0.0.2 asdf 1234
            192.168.255.255 123 !!!
            123! 255.255.255.255 !! 
        `);
        
        expect(result.length).to.equal(4);
        expect(result[0][0]).to.equal('127.0.0.1');
        expect(result[1][0]).to.equal('127.0.0.2');
        expect(result[2][0]).to.equal('192.168.255.255');
        expect(result[3][0]).to.equal('255.255.255.255');
        
    });

});
