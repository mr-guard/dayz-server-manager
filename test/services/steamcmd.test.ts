import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as path from 'path';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as downloadModule from '../../src/util/download';
import * as compareFolderModule from '../../src/util/compare-folders';
import { SteamCMD } from '../../src/services/steamcmd';

describe('Test class SteamCMD', () => {

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

    // TODO Extract cleanup tests
    it('SteamCmd-checkSteamCmd', async () => {

        const expectedSteamCmdPath = path.join(
            'testCwd',
            'testSteamCmd'
        );
        const expectedSteamCmdExePath = path.join(
            expectedSteamCmdPath,
            'steamcmd.exe',
        );
        const expectedZipPath = path.join(
            expectedSteamCmdPath,
            'steamcmd.zip',
        );

        const existsMock = ImportMock.mockFunction(fs, 'existsSync');
        existsMock.withArgs(expectedSteamCmdExePath).returns(false);
        existsMock.withArgs(expectedZipPath).returns(true);
        const unlinkMock = ImportMock.mockFunction(fs, 'unlinkSync');
        const unlinkZipMock = unlinkMock.withArgs(expectedZipPath);

        let downloadMock = ImportMock.mockFunction(downloadModule, 'download')
            .throws('test');
        let extractMock = ImportMock.mockFunction(downloadModule, 'extractZip')
            .throws('test');

        const manager = {
            config: {
                steamCmdPath: 'testSteamCmd',
            },
        } as any;

        const steamCmd = new SteamCMD(manager);
        steamCmd['paths'].cwd = () => 'testCwd';
        steamCmd['extractDelay'] = 10;
        
        let timeoutThrown = false;
        let retried = false;
        steamCmd['processes'].spawnForOutput = async (cmd, args, ops) => {
            if (timeoutThrown) {
                retried = true;
                return {
                    status: 0,
                    stderr: '',
                    stdout: '',
                };
            }
            timeoutThrown = true;
            throw {
                status: 10,
                stderr: '',
                stdout: '',
            };
        }

        // should cleanup
        const resDownloadErr = await steamCmd.checkSteamCmd();
        expect(resDownloadErr).to.be.false;
        expect(unlinkZipMock.callCount).to.equal(1);
        
        unlinkMock.reset();
        downloadMock.restore();
        downloadMock = ImportMock.mockFunction(downloadModule, 'download');
        const resExtractErr = await steamCmd.checkSteamCmd();
        expect(resExtractErr).to.be.false;
        expect(unlinkZipMock.callCount).to.equal(1);

        unlinkMock.reset();
        downloadMock.reset();
        extractMock.restore();
        extractMock = ImportMock.mockFunction(downloadModule, 'extractZip');
        const res = await steamCmd.checkSteamCmd();

        expect(downloadMock.callCount).to.equal(1);
        expect(extractMock.callCount).to.equal(1);
        expect(unlinkZipMock.callCount).to.equal(1);
        expect(retried).to.be.true;
        expect(res).to.be.true;
    });

    it('SteamCmd-checkServer', async () => {

        const existsMock = ImportMock.mockFunction(fs, 'existsSync')
            .withArgs(path.join('testserver', 'server.exe'))
            .returns(true);
        const manager = {
            config: {
                serverExe: 'server.exe',
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);

        const res = await steamCmd.checkServer();

        expect(res).to.be.true;
        expect(existsMock.callCount).to.equal(1);

    });

    it('SteamCmd-updateServer', async () => {

        const existsServerMock = ImportMock.mockFunction(fs, 'existsSync')
            .withArgs(path.join('testserver', 'server.exe'))
            .returns(true);

        const ensureMock = ImportMock.mockFunction(fse, 'ensureDirSync')
            .withArgs('testserver')
            .returns(true);

        const manager = {
            config: {
                serverExe: 'server.exe',
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        let calledArgs;
        steamCmd['processes'].spawnForOutput = async (cmd, args, ops) => {
            calledArgs = args;
            return {
                status: 0,
                stderr: '',
                stdout: '',
            };
        }

        const res = await steamCmd.updateServer();

        expect(res).to.be.true;
        expect(ensureMock.callCount).to.equal(1);

        expect(calledArgs).to.include('testserver');
        expect(calledArgs).to.include(SteamCMD['DAYZ_SERVER_APP_ID']);

    });

    it('SteamCmd-modParams', async () => {

        const existsMock = ImportMock.mockFunction(fs, 'existsSync', true);

        const expectedModsPath = `testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}`;
        const readFileMock = ImportMock.mockFunction(fs, 'readFileSync')
            .withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp'))
            .returns('name = "Test Mod"');


        const manager = {
            config: {
                steamWsMods: ['1234567'],
                steamWorkshopPath: 'testwspath'
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        steamCmd['paths'].cwd = () => 'testcwd';
        
        const res = await steamCmd.buildWsModParams();

        expect(res).to.include('@Test-Mod');
    });

    it('SteamCmd-updateMods', async () => {

        const existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        const ensureDirMock = ImportMock.mockFunction(fse, 'ensureDirSync');
        const expectedModsPath = `testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}`;
        const readFileMock = ImportMock.mockFunction(fs, 'readFileSync')
            .withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp'))
            .returns('name = "Test Mod"');


        const manager = {
            config: {
                steamWsMods: ['1234567'],
                steamWorkshopPath: 'testwspath'
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        steamCmd['paths'].cwd = () => 'testcwd';

        let calledCount = 0;
        let calledArgs;
        steamCmd['processes'].spawnForOutput = async (cmd, args, ops) => {
            calledCount++;
            calledArgs = args;
            return {
                status: 0,
                stderr: '',
                stdout: '',
            };
        }

        const res = await steamCmd.updateMods();

        expect(res).to.be.true;
        expect(calledCount).to.equal(1);

        expect(calledArgs).to.include(path.join('testcwd','testwspath'));
        expect(calledArgs).to.include('1234567');
        expect(calledArgs).to.include(SteamCMD['DAYZ_APP_ID']);

    });

    it('SteamCmd-checkMods', async () => {

        const expectedModsPath = `testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}`;
        let existsMock = ImportMock.mockFunction(fs, 'existsSync', true);

        let readFileMock = ImportMock.mockFunction(fs, 'readFileSync');
        readFileMock.withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp'))
            .returns('name = "Test Mod"');


        const manager = {
            config: {
                steamWsMods: ['1234567'],
                steamWorkshopPath: 'testwspath'
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        steamCmd['paths'].cwd = () => 'testcwd';

        const res = await steamCmd.checkMods();
        expect(res).to.be.true;
        
        existsMock.restore();
        existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        existsMock.withArgs(path.join(expectedModsPath, '1234567')).returns(false);
        const resNotFound = await steamCmd.checkMods();
        expect(resNotFound).to.be.false;

        existsMock.restore();
        existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        existsMock.withArgs(path.join('testserver', '@Test-Mod')).returns(false);
        const resNotInstalled = await steamCmd.checkMods();
        expect(resNotInstalled).to.be.false;

        existsMock.restore();
        existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        readFileMock.restore();
        readFileMock = ImportMock.mockFunction(fs, 'readFileSync');
        readFileMock.withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp')).returns('')
        const resNoName = await steamCmd.checkMods();
        expect(resNoName).to.be.false;


    });

    it('SteamCmd-installMods-copy', async () => {

        const expectedModsPath = `testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}`;
        let existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        let unlinkMock = ImportMock.mockFunction(fs, 'unlinkSync');
        let copyKeyMock = ImportMock.mockFunction(fs.promises, 'copyFile');

        let readFileMock = ImportMock.mockFunction(fs, 'readFileSync');
        readFileMock.withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp'))
            .returns('name = "Test Mod"');
        readFileMock.withArgs(path.join('testserver', '@Test-Mod', 'meta.cpp'))
            .returns('name = "Test Mod"');

        let dirHashMock = ImportMock.mockFunction(compareFolderModule, 'sameDirHash', Promise.resolve(false));

        const manager = {
            config: {
                steamWsMods: ['1234567'],
                steamWorkshopPath: 'testwspath',
                linkModDirs: false,
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        sinon.stub(steamCmd['paths'], 'cwd').returns('testcwd');
        const copyStub = sinon.stub(steamCmd['paths'], 'copyDirFromTo');
        copyStub.withArgs(
            path.join(expectedModsPath, '1234567'),
            path.join('testserver', '@Test-Mod'),
        ).returns(Promise.resolve(true));
        const findFilesStub = sinon.stub(steamCmd['paths'], 'findFilesInDir')
            .returns(Promise.resolve(['modKeys/testkey.bikey']));

        const res = await steamCmd.installMods();
        expect(res).to.be.true;
        // expect(dirHashMock.callCount).to.equal(1);
        // console.log(readFileMock.getCalls());
        expect(copyStub.callCount).to.equal(0);
        expect(copyKeyMock.callCount).to.equal(1);

    });

    it('SteamCmd-installMods-link', async () => {

        const expectedModsPath = `testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}`;
        let existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        let unlinkMock = ImportMock.mockFunction(fs, 'unlinkSync');
        let copyKeyMock = ImportMock.mockFunction(fs.promises, 'copyFile');

        let readFileMock = ImportMock.mockFunction(fs, 'readFileSync');
        readFileMock.withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp'))
            .returns('name = "Test Mod"');

        const manager = {
            config: {
                steamWsMods: ['1234567'],
                steamWorkshopPath: 'testwspath',
                linkModDirs: true,
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        sinon.stub(steamCmd['paths'], 'cwd').returns('testcwd');
        const linkStub = sinon.stub(steamCmd['paths'], 'linkDirsFromTo');
        linkStub.withArgs(
            path.join(expectedModsPath, '1234567'),
            path.join('testserver', '@Test-Mod'),
        ).returns(true);
        const findFilesStub = sinon.stub(steamCmd['paths'], 'findFilesInDir')
            .returns(Promise.resolve(['modKeys/testkey.bikey']));

        const res = await steamCmd.installMods();
        expect(res).to.be.true;
        expect(linkStub.callCount).to.equal(1);
        expect(copyKeyMock.callCount).to.equal(1);

    });


    it('SteamCmd-updateMods', async () => {

        const existsMock = ImportMock.mockFunction(fs, 'existsSync', true);
        const ensureDirMock = ImportMock.mockFunction(fse, 'ensureDirSync');
        const expectedModsPath = `testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}`;
        const readFileMock = ImportMock.mockFunction(fs, 'readFileSync')
            .withArgs(path.join(expectedModsPath, '1234567', 'meta.cpp'))
            .returns('name = "Test Mod"');


        const manager = {
            config: {
                steamWsMods: ['1234567'],
                steamWorkshopPath: 'testwspath'
            },
            getServerPath: () => 'testserver',
        } as any;

        const steamCmd = new SteamCMD(manager);
        steamCmd['progressLog'] = false;
        steamCmd['paths'].cwd = () => 'testcwd';
        const spawnStub = sinon.stub(steamCmd['processes'], 'spawnForOutput')
            .throws({
                status: 10,
                stderr: '',
                stdout: '',
            })

        const res = await steamCmd.updateMods();
        expect(res).to.be.false;
        expect(spawnStub.callCount).to.be.greaterThan(1);

    });

});
