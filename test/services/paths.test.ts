import 'reflect-metadata';

import { expect } from '../expect';
import * as path from 'path';
import { Paths } from '../../src/services/paths';
import { disableConsole, enableConsole, fakeChildProcess, memfs } from '../util';
import { DependencyContainer, container } from 'tsyringe';

describe('Test class Paths', () => {

    let injector: DependencyContainer;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();
        memfs({}, '/', injector);
        fakeChildProcess(injector);
    });

    it('Paths-samePath-rel', () => {

        const paths = injector.resolve(Paths);
        
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
                paths.samePath(same1, others[i]!),
                `same1 should not be the same as others[${i}]`,
            ).to.be.false;

            expect(
                paths.samePath(same2, others[i]!),
                `same2 should not be the same as others[${i}]`,
            ).to.be.false;
        }
        
        for (let i = 0; i < others.length; ++i) {
            for (let j = 0; j < others.length; ++j) {
                if (i === j && others[i]) {
                    expect(
                        paths.samePath(others[i]!, others[j]!),
                        `others[${i}] should be the same as others[${j}]`,
                    ).to.be.true;
                } else {
                    expect(
                        paths.samePath(others[i]!, others[j]!),
                        `others[${i}] should not be the same as others[${j}]`,
                    ).to.be.false;
                }
            }
        }
        
    });

    it('Paths-samePath-abs', () => {

        const paths = injector.resolve(Paths);
        
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
                paths.samePath(same1, others[i]!),
                `same1 should not be the same as others[${i}]`,
            ).to.be.false;

            expect(
                paths.samePath(same2, others[i]!),
                `same2 should not be the same as others[${i}]`,
            ).to.be.false;
        }
        
        for (let i = 0; i < others.length; ++i) {
            for (let j = 0; j < others.length; ++j) {
                if (i === j && others[i]) {
                    expect(
                        paths.samePath(others[i]!, others[j]!),
                        `others[${i}] should be the same as others[${j}]`,
                    ).to.be.true;
                } else {
                    expect(
                        paths.samePath(others[i]!, others[j]!),
                        `others[${i}] should not be the same as others[${j}]`,
                    ).to.be.false;
                }
            }
        }
        
    });

    it('Paths-findFilesInDir', async () => {
        
        memfs(
            {
                'test' : {
                    'file1': '',
                    'file2': '',
                    'test': {
                        'file3': '',
                    },
                },
            },
            '/',
            injector,
        );

        const paths = injector.resolve(Paths);
        const result = await paths.findFilesInDir('/test');

        expect(result).not.to.be.empty;
        expect(result.length).to.equal(3);
        expect(result).to.include(path.join('/test', 'file1'));
        expect(result).to.include(path.join('/test', 'file2'));
        expect(result).to.include(path.join('/test', 'test', 'file3'));
    });

    it('Paths-findFilesInDir-notExisting', () => {
        const paths = injector.resolve(Paths);
        const result = paths.findFilesInDir('test');
        expect(result).to.be.empty;
    });

    it('Paths-copyFromPkg', () => {
        const fs = memfs(
            {
                '/test/file1': 'filecontent1',
                '/test/file2': 'filecontent2',
                '/test/test/file3': 'filecontent3',
            },
            '/',
            injector,
        );

        const paths = injector.resolve(Paths);

        paths.copyFromPkg('/test', '/tmp/dest');

        expect(fs.existsSync('/tmp/dest/file1')).to.be.true;
        expect(fs.existsSync('/tmp/dest/file2')).to.be.true;
        expect(fs.existsSync('/tmp/dest/test/file3')).to.be.true;

        expect(fs.readFileSync('/tmp/dest/file1') + '').to.equal('filecontent1');
        expect(fs.readFileSync('/tmp/dest/file2') + '').to.equal('filecontent2');
        expect(fs.readFileSync('/tmp/dest/test/file3') + '').to.equal('filecontent3');


    });

    it('Paths-removeLink', () => {
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.returns({ status: 0 } as any);

        const paths = injector.resolve(Paths);

        const link = 'test/test/test.png';
        const result = paths.removeLink(link);

        expect(result).to.be.true;
        expect(childProcess.spawnSync.callCount).to.equal(1);
        expect(childProcess.spawnSync.firstCall.args[1]).to.include(link);
    });

    it('Paths-linkDirsFromTo', async () => {

        memfs(
            {
                'src/dir/path': {},
                'dest/dir/path': {},
            },
            '/',
            injector,
        );
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.returns({ status: 0 } as any);

        const paths = injector.resolve(Paths);

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const result = await paths.linkDirsFromTo(src, dest);

        expect(result).to.be.true;
        expect(childProcess.spawnSync.firstCall.args[1]).to.include(src);
        expect(childProcess.spawnSync.firstCall.args[1]).to.include(dest);

    });

    it('Paths-linkDirsFromTo-unlinkFail', async () => {

        memfs(
            {
                'src/dir/path': {},
                'dest/dir/path': {},
            },
            '/',
            injector,
        );
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.returns({ status: 1 } as any);

        const paths = injector.resolve(Paths);

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const result = await paths.linkDirsFromTo(src, dest);

        expect(result).to.be.false;
        expect(childProcess.spawnSync.callCount).to.equal(1);

    });

    it('Paths-linkDirsFromTo-ex', async () => {

        memfs(
            {
                'src/dir/path': {},
                'dest/dir/path': {},
            },
            '/',
            injector,
        );
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.throws();

        const src = 'source/dir/path';
        const dest = 'dest/dir/path';
        
        const paths = injector.resolve(Paths);
        const result = await paths.linkDirsFromTo(src, dest);

        expect(result).to.be.false;
        expect(childProcess.spawnSync.callCount).to.equal(1);

    });

    it('Paths-copyDirFromTo', async () => {

        const fs = memfs(
            {
                'src/dir/path': {
                    'test1': 'testcontent1',
                    'test2': 'testcontent2',
                },
                'dest/dir': {},
            },
            '/',
            injector,
        );
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.returns({ status: 0 } as any);

        const src = '/src/dir/path/';
        const dest = '/dest/dir/path';
        
        const paths = injector.resolve(Paths);
        const result = await paths.copyDirFromTo(src, dest);

        expect(result).to.be.true;
        expect(fs.readFileSync(path.join(dest, 'test1')) + '').to.equal('testcontent1');
        expect(fs.readFileSync(path.join(dest, 'test2')) + '').to.equal('testcontent2');

    });

    it('Paths-copyDirFromTo-unlinkFail', async () => {

        memfs(
            {
                'src/dir/path': {
                    'test1': 'testcontent1',
                    'test2': 'testcontent2',
                },
                'dest/dir/path': {},
            },
            '/',
            injector,
        );
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.returns({ status: 1 } as any);


        const src = '/src/dir/path';
        const dest = '/dest/dir/path';
        
        const paths = injector.resolve(Paths);
        const result = await paths.copyDirFromTo(src, dest);

        expect(result).to.be.false;
        expect(childProcess.spawnSync.callCount).to.equal(1);
        // expect(copyStub.callCount).to.equal(0);
        // TODO check dest folder
    });

    it('Paths-copyDirFromTo-ex', async () => {

        memfs(
            {
                'src/dir/path': {
                    'test1': 'testcontent1',
                    'test2': 'testcontent2',
                },
                'dest/dir/path': {},
            },
            '/',
            injector,
        );
        const childProcess = fakeChildProcess(injector);
        childProcess.spawnSync.throws();

        const src = '/src/dir/path';
        const dest = '/dest/dir/path';
        
        const paths = injector.resolve(Paths);
        const result = await paths.copyDirFromTo(src, dest);

        expect(result).to.be.false;
        expect(childProcess.spawnSync.callCount).to.equal(1);
        // expect(copyStub.callCount).to.equal(0);
        // TODO check dest
    });

});
