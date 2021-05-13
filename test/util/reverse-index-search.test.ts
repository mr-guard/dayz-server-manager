import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as fs from 'fs';
import * as folderHash from 'folder-hash';

import { reverseIndexSearch } from '../../src/util/reverse-index-search';

describe('Test reverse index search', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('reverseIndexSearch', () => {

        const result1 = reverseIndexSearch(
            ['test', 'asdasd', 'asd123', 'fgh123', 'asd12'],
            (x) => x.includes('123')
        );
        const result2 = reverseIndexSearch(
            ['test', 'asdasd', 'asd123', 'fgh12', 'asd12'],
            (x) => x.includes('123')
        );

        const result3 = reverseIndexSearch(
            ['test', 'asdasd', 'asd12', 'fgh12', 'asd12'],
            (x) => x.includes('123')
        );
        
        expect(result1).to.equal(3);
        expect(result2).to.equal(2);
        expect(result3).to.equal(-1);

    });

});
