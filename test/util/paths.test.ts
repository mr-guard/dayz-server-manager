import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as child_process from 'child_process';
import { Paths } from '../../src/util/paths';
import { disableConsole, enableConsole } from '../util';

describe('Test class Paths', () => {

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

    it('Paths-samePath-rel', () => {

        const paths = new Paths();
        
        const same1 = 'Test123/Test/meme.png';
        const same2 = 'Test123\\Test/meme.png';
        
        const others = [
            'Test321/Test/meme.png',
            'Test123/Test/meme.jpg',
            '/Test123/Test/meme.png',
            null,
        ];
        
        expect(paths.samePath(same1, same2)).to.be.true;
        
        for (let i = 0; i < others.length; ++i) {
            expect(
                paths.samePath(same1, others[i]),
                `same1 should not be the same as others[${i}]`,
            ).to.be.false;

            expect(
                paths.samePath(same2, others[i]),
                `same2 should not be the same as others[${i}]`,
            ).to.be.false;
        }
        
        for (let i = 0; i < others.length; ++i) {
            for (let j = 0; j < others.length; ++j) {
                if (i === j && others[i]) {
                    expect(
                        paths.samePath(others[i], others[j]),
                        `others[${i}] should be the same as others[${j}]`,
                    ).to.be.true;
                } else {
                    expect(
                        paths.samePath(others[i], others[j]),
                        `others[${i}] should not be the same as others[${j}]`,
                    ).to.be.false;
                }
            }
        }
        
    });

    it('Paths-samePath-abs', () => {

        const paths = new Paths();
        
        const same1 = 'C:/Test123/Test/meme.png';
        const same2 = 'C:/Test123\\Test/meme.png';
        
        const others = [
            'Test321/Test/meme.png',
            'Test123/Test/meme.jpg',
            '/Test123/Test/meme.png',
            null,
        ];
        
        expect(paths.samePath(same1, same2)).to.be.true;
        
        for (let i = 0; i < others.length; ++i) {
            expect(
                paths.samePath(same1, others[i]),
                `same1 should not be the same as others[${i}]`,
            ).to.be.false;

            expect(
                paths.samePath(same2, others[i]),
                `same2 should not be the same as others[${i}]`,
            ).to.be.false;
        }
        
        for (let i = 0; i < others.length; ++i) {
            for (let j = 0; j < others.length; ++j) {
                if (i === j && others[i]) {
                    expect(
                        paths.samePath(others[i], others[j]),
                        `others[${i}] should be the same as others[${j}]`,
                    ).to.be.true;
                } else {
                    expect(
                        paths.samePath(others[i], others[j]),
                        `others[${i}] should not be the same as others[${j}]`,
                    ).to.be.false;
                }
            }
        }
        
    });

    it('Paths-findFilesInDir', async () => {
        const existsStub = ImportMock.mockFunction(fs, 'existsSync');
        const readDirStub = ImportMock.mockFunction(fse, 'readdir');
        const lstatStub = ImportMock.mockFunction(fse, 'lstat');
        
        existsStub.returns(true);

        lstatStub
            .returns(
                Promise.resolve({ isDirectory: () => false })
            )
            .withArgs(path.join('test', 'test')).returns(
                Promise.resolve({ isDirectory: () => true })
            );

        readDirStub
            .returns([])
            .withArgs('test').returns(Promise.resolve(['file1','file2','test']))
            .withArgs(path.join('test', 'test')).returns(Promise.resolve(['file3']));
        
        const paths = new Paths();
        const result = await paths.findFilesInDir('test');

        expect(result).not.to.be.empty;
        expect(result.length).to.equal(3);
        expect(result).to.include(path.join('test', 'file1'));
        expect(result).to.include(path.join('test', 'file2'));
        expect(result).to.include(path.join('test', 'test', 'file3'));
    });

    it('Paths-findFilesInDir-notExisting', () => {
        ImportMock.mockFunction(fs, 'existsSync', false);
        const paths = new Paths();
        const result = paths.findFilesInDir('test');
        expect(result).to.be.empty;
    });

    it('Paths-copyFromPkg', () => {
        ImportMock.mockFunction(fse, 'ensureDirSync');
        
        ImportMock.mockFunction(fs, 'readFileSync', 'filecontent');
        const writeStub = ImportMock.mockFunction(fs, 'writeFileSync');

        const existsStub = ImportMock.mockFunction(fs, 'existsSync');
        const readDirStub = ImportMock.mockFunction(fs, 'readdirSync');
        const lstatStub = ImportMock.mockFunction(fs, 'lstatSync');
        
        existsStub.returns(true);

        lstatStub
            .returns({ isDirectory: () => false })
            .withArgs('test').returns({ isDirectory: () => true })
            .withArgs(path.join('test', 'test')).returns({ isDirectory: () => true });

        readDirStub
            .returns([])
            .withArgs('test').returns(['file1','file2','test'])
            .withArgs(path.join('test', 'test')).returns(['file3']);
        
        const paths = new Paths();
        paths.copyFromPkg('test', 'tmp/dest');

        expect(writeStub.callCount).to.equal(3);
        expect(writeStub.firstCall.args[0]).to.equal(path.join('tmp', 'dest', 'file1'));
        expect(writeStub.firstCall.args[1]).to.equal('filecontent');
        expect(writeStub.secondCall.args[0]).to.equal(path.join('tmp', 'dest', 'file2'));
        expect(writeStub.secondCall.args[1]).to.equal('filecontent');
        expect(writeStub.thirdCall.args[0]).to.equal(path.join('tmp', 'dest', 'test', 'file3'));
        expect(writeStub.thirdCall.args[1]).to.equal('filecontent');

    });

    it('Paths-removeLink', () => {
        const stub = ImportMock.mockFunction(child_process, 'spawnSync', { status: 0 });

        const paths = new Paths();

        const link = 'test/test/test.png';
        const result = paths.removeLink(link);

        expect(result).to.be.true;
        expect(stub.callCount).to.equal(1);
        expect(stub.firstCall.args[1]).to.include(link);
    });

    it('Paths-linkDirsFromTo', async () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        const spawnSyncStub = ImportMock.mockFunction(child_process, 'spawnSync', { status: 0 });

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = new Paths();
        const result = await paths.linkDirsFromTo(src, dest);

        expect(result).to.be.true;
        expect(spawnSyncStub.secondCall.args[1]).to.include(src);
        expect(spawnSyncStub.secondCall.args[1]).to.include(dest)

    });

    it('Paths-linkDirsFromTo-unlinkFail', async () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        const spawnSyncStub = ImportMock.mockFunction(child_process, 'spawnSync', { status: 1 });

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = new Paths();
        const result = await paths.linkDirsFromTo(src, dest);

        expect(result).to.be.false;
        expect(spawnSyncStub.callCount).to.equal(1);

    });

    it('Paths-linkDirsFromTo-ex', async () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        const spawnSyncStub = ImportMock.mockFunction(child_process, 'spawnSync')
            .throws();

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = new Paths();
        const result = await paths.linkDirsFromTo(src, dest);

        expect(result).to.be.false;
        expect(spawnSyncStub.callCount).to.equal(1);

    });

    it('Paths-copyDirFromTo', async () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        const spawnSyncStub = ImportMock.mockFunction(child_process, 'spawnSync', { status: 0 });
        ImportMock.mockFunction(fse, 'ensureDir');
        const copyStub = ImportMock.mockFunction(fse, 'copy');

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = new Paths();
        const result = await paths.copyDirFromTo(src, dest);

        expect(result).to.be.true;
        expect(copyStub.callCount).to.equal(1);
        expect(copyStub.firstCall.args).to.include(src);
        expect(copyStub.firstCall.args).to.include(dest);

    });

    it('Paths-copyDirFromTo-unlinkFail', async () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        const spawnSyncStub = ImportMock.mockFunction(child_process, 'spawnSync', { status: 1 });
        ImportMock.mockFunction(fse, 'ensureDir');
        const copyStub = ImportMock.mockFunction(fse, 'copy');

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = new Paths();
        const result = await paths.copyDirFromTo(src, dest);

        expect(result).to.be.false;
        expect(spawnSyncStub.callCount).to.equal(1);
        expect(copyStub.callCount).to.equal(0);

    });

    it('Paths-copyDirFromTo-ex', async () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fse, 'ensureDir');
        const copyStub = ImportMock.mockFunction(fse, 'copy');

        const spawnSyncStub = ImportMock.mockFunction(child_process, 'spawnSync')
            .throws();

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = new Paths();
        const result = await paths.copyDirFromTo(src, dest);

        expect(result).to.be.false;
        expect(spawnSyncStub.callCount).to.equal(1);
        expect(copyStub.callCount).to.equal(0);

    });

});
