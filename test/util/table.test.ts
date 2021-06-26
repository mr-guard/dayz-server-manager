import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports';

import { makeTable } from '../../src/util/table';

describe('Test makeTable', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('makeTable', () => {

        const result = makeTable([
            ['asdf', '1234', 'wxyz'],
            ['asdf12', '1234', 'wxyz'],
            ['asdf', '123412', 'wxyz']
        ]);
        
        expect(result.length).to.equal(3);
        expect(result[0]).to.equal('asdf      1234      wxyz');
        expect(result[1]).to.equal('asdf12  1234      wxyz');
        expect(result[2]).to.equal('asdf      123412  wxyz');
        
        
    });

});
