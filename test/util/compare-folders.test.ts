import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as fs from 'fs';
import * as folderHash from 'folder-hash';

import { sameDirHash } from '../../src/util/compare-folders';

describe('Test compare folder', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('compare-folders', async () => {

        const f1 = 'Test123/Test/meme.png';
        const f2 = 'Test123\\Test/meme.png';
        const otherHash = 'otherhash';
        
        const nonExists = 'i-dont-exist';

        const hashStub = ImportMock.mockFunction(folderHash, 'hashElement');
        const existsStub = ImportMock.mockFunction(fs, 'existsSync');
        
        existsStub
            .withArgs(f1).returns(true)
            .withArgs(f2).returns(true)
            .withArgs(nonExists).returns(false);

        hashStub
            .returns(
                Promise.resolve({ hash: '1234' })
            )
            .withArgs('otherhash').returns(
                Promise.resolve({ hash: '4321' })
            );

        const resultSame = await sameDirHash(f1, f2);
        const resultOther = await sameDirHash(f1, otherHash);
        const resultNonExist = await sameDirHash(f1, nonExists);
        
        expect(resultSame).to.be.true;
        expect(resultOther).to.be.false;
        expect(resultNonExist).to.be.false;
        
        
    });

});
