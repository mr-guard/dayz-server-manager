import { expect } from '../expect';

import { sameDirHash } from '../../src/util/compare-folders';
import { memfs } from '../util';

describe('Test compare folder', () => {

    it('compare-folders', async () => {

        const f1 = 'Test123/Test/meme.png';
        const f2 = 'Test123\\Test/meme.png';
        const f3 = 'Test123\\Test/meme2.png';
        
        const fs = memfs({
            [f1]: 'test',
            [f3]: 'test123',
        }, process.cwd());

        const nonExists = 'i-dont-exist';


        const resultSame = await sameDirHash(fs, f1, f2);
        const resultOther = await sameDirHash(fs, f1, f3);
        const resultNonExist = await sameDirHash(fs, f1, nonExists);
        
        expect(resultSame).to.be.true;
        expect(resultOther).to.be.false;
        expect(resultNonExist).to.be.false;
        
        
    });

});
