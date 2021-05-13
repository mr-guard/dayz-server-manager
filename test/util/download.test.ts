import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as http from 'http';


import { download } from '../../src/util/download';

describe('Test download', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('download', async () => {

        const ensureDirStub = ImportMock.mockFunction(fse, 'ensureDirSync');
        const writeStreamStub = ImportMock.mockFunction(fs, 'createWriteStream');
        const httpStub = ImportMock.mockFunction(http, 'get');

        const url = 'http://fdsalfdsjhfkjdsaf.com/file.txt';
        const target = 'test123/test.txt';
        
        let pipeCalled = false;
        httpStub.callsArgWith(1, { pipe: (a) => {
            pipeCalled = true;
        }, });
        
        writeStreamStub.returns({
            on: (t, r) => {
                r();
            },
            close: () => {},
        });

        await download(url, target);
        
        expect(ensureDirStub.callCount).to.equal(1);
        expect(ensureDirStub.firstCall.args[0]).to.equal('test123');
        expect(writeStreamStub.callCount).to.equal(1);
        expect(writeStreamStub.firstCall.args[0]).to.equal(target);
        expect(pipeCalled).to.be.true;
        
        
    });

});
