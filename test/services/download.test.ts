import { expect } from '../expect';
import * as fsModule from 'fs';
import * as sinon from 'sinon';


import { Downloader } from '../../src/services/download';
import { memfs } from '../util';
import { HTTPSAPI } from '../../src/util/apis';

describe('Test download', () => {

    beforeEach(() => {
    });

    it('download', async () => {

        const url = 'https://example.com/file.txt';
        const target = 'test123/test.txt';
        
        const fs = memfs({});
        
        const httpStub = sinon.stub();
        let pipeCalled = false;
        httpStub.callsArgWith(1, { pipe: (file: fsModule.WriteStream) => {
            pipeCalled = true;
            file.write('test', () => file.end());
        }, });

        await new Downloader(fs, { get: httpStub } as any as HTTPSAPI).download(url, target);
        expect(pipeCalled).to.be.true;
        expect(fs.existsSync(target)).to.be.true;
        expect(fs.readFileSync(target, { encoding: 'utf-8' })).to.equal('test');
        
    });

});
