import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Backups } from '../../src/services/backups';

describe('Test class Backups', () => {

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('Backups', async () => {

        ImportMock.mockFunction(fse, 'ensureDir');
        ImportMock.mockFunction(fs, 'existsSync', true);
        const copyMock = ImportMock.mockFunction(fse, 'copy');

        const readDirMock = ImportMock.mockFunction(fs.promises, 'readdir');
        readDirMock.withArgs(path.resolve('/test/backups'))
            .returns(Promise.resolve(['mpmissions_backup']));

        const lstatMock = ImportMock.mockFunction(fs.promises, 'stat');
        lstatMock.withArgs(path.resolve('/test/backups/mpmissions_backup'))
            .returns(Promise.resolve({
                isDirectory: () => true,
                mtime: new Date(new Date().valueOf() - 50000),
            }));

        const manager = {
            config: {
                backupPath: 'backups',
                backupMaxAge: 0,
            },
            getServerPath: () => 'testserver',
        };

        const backup = new Backups(manager as any);

        backup['paths'].cwd = () => '/test';
        const unlinkStub = sinon.stub(backup['paths'], 'removeLink');

        await backup.createBackup();

        // wait because cleanup is async
        await new Promise((r) => setTimeout(r, 10));

        expect(copyMock.callCount).to.equal(1);
        expect(unlinkStub.callCount).to.equal(1);

    });

});
