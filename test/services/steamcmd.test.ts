import 'reflect-metadata';

import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import * as path from 'path';
import { SteamCMD } from '../../src/services/steamcmd';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Paths } from '../../src/services/paths';
import { Manager } from '../../src/control/manager';
import { Processes } from '../../src/services/processes';
import { FSAPI } from '../../src/util/apis';
import { Downloader } from '../../src/services/download';

describe('Test class SteamCMD', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let paths: StubInstance<Paths>;
    let processes: StubInstance<Processes>;
    let fs: FSAPI;
    let download: StubInstance<Downloader>;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();

        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(Paths, stubClass(Paths), { lifecycle: Lifecycle.Singleton });
        injector.register(Processes, stubClass(Processes), { lifecycle: Lifecycle.Singleton });
        injector.register(Downloader, stubClass(Downloader), { lifecycle: Lifecycle.Singleton });

        fs = memfs({}, '/', injector);
        download = injector.resolve(Downloader) as any;
        manager = injector.resolve(Manager) as any;
        paths = injector.resolve(Paths) as any;
        processes = injector.resolve(Processes) as any;
    });

    it('SteamCmd-checkSteamCmd-cleanupDownloadFail', async () => {

        const expectedSteamCmdPath = path.join(
            '/testCwd',
            'testSteamCmd'
        );
        const expectedZipPath = path.join(
            expectedSteamCmdPath,
            'steamcmd.zip',
        );

        fs = memfs(
            {
                'testCwd': {
                    'testSteamCmd': {
                        'steamcmd.zip': 'zip-data',
                    },
                },
            },
            '/',
            injector,
        );

        download.download.throws('test');

        manager.config = {
            steamCmdPath: 'testSteamCmd',
        } as any;

        const steamCmd = injector.resolve(SteamCMD);
        steamCmd['extractDelay'] = 10;
        
        paths.cwd.returns('/testCwd');
        
        // should cleanup
        const resDownloadErr = await steamCmd.checkSteamCmd();
        expect(resDownloadErr).to.be.false;
        expect(fs.existsSync(expectedZipPath)).to.be.false;
    });

    it('SteamCmd-checkSteamCmd-cleanupExtractFail', async () => {

        const expectedSteamCmdPath = path.join(
            '/testCwd',
            'testSteamCmd'
        );
        const expectedZipPath = path.join(
            expectedSteamCmdPath,
            'steamcmd.zip',
        );

        fs = memfs(
            {
                'testCwd': {
                    'testSteamCmd': {
                        'steamcmd.zip': 'zip-data',
                    },
                },
            },
            '/',
            injector,
        );

        download.extractZip.throws('test');

        manager.config = {
            steamCmdPath: 'testSteamCmd',
        } as any;

        const steamCmd = injector.resolve(SteamCMD);
        steamCmd['extractDelay'] = 10;
        
        paths.cwd.returns('/testCwd');
        
        // should cleanup
        const resExtractErr = await steamCmd.checkSteamCmd();
        expect(resExtractErr).to.be.false;
        expect(fs.existsSync(expectedZipPath)).to.be.false;
    });

    it('SteamCmd-checkSteamCmd', async () => {

        const expectedSteamCmdPath = path.join(
            '/testCwd',
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

        fs = memfs(
            {
                'testCwd': {
                    'testSteamCmd': {
                        'steamcmd.zip': 'zip-data',
                    },
                },
            },
            '/',
            injector,
        );

        manager.config = {
            steamCmdPath: 'testSteamCmd',
        } as any;

        const steamCmd = injector.resolve(SteamCMD);
        steamCmd['extractDelay'] = 10;
        
        paths.cwd.returns('/testCwd');
        
        let timeoutThrown = false;
        let retried = false;
        processes.spawnForOutput.callsFake(async (cmd, args, ops) => {
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
        })

        const res = await steamCmd.checkSteamCmd();
        
        expect(res).to.be.true;
        expect(fs.existsSync(expectedZipPath)).to.be.false;
        
        expect(download.download.callCount).to.equal(1);
        expect(download.extractZip.callCount).to.equal(1);
        expect(retried).to.be.true;
    });

    it('SteamCmd-checkServer', async () => {

        fs = memfs(
            {
                'testserver': {
                    'server.exe': 'exe',
                },
            },
            '/',
            injector,
        );

        manager.config = {
            serverExe: 'server.exe',
        } as any;
        manager.getServerPath.returns('/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const res = await steamCmd.checkServer();

        expect(res).to.be.true;

    });

    it('SteamCmd-updateServer', async () => {

        manager.config = {
            serverExe: 'server.exe',
        } as any;
        manager.getServerPath.returns('/testserver');
        paths.cwd.returns('/');

        const steamCmd = injector.resolve(SteamCMD);

        let calledArgs: string[] | undefined;
        processes.spawnForOutput.callsFake(async (cmd, args, ops) => {
            calledArgs = args;

            fs.writeFileSync('/testserver/server.exe', 'exe');

            return {
                status: 0,
                stderr: '',
                stdout: '',
            };
        });

        const res = await steamCmd.updateServer();

        expect(res).to.be.true;
        expect(calledArgs).to.include('/testserver');
        expect(calledArgs).to.include(SteamCMD['DAYZ_SERVER_APP_ID']);

    });

    it('SteamCmd-modParams', async () => {

        fs = memfs(
            {
                'testcwd/testwspath/steamapps/workshop/content': {
                    [SteamCMD['DAYZ_APP_ID']]: {
                        '1234567': {
                            'meta.cpp': 'name = "Test Mod"',
                        },
                    },
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath'
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('testserver');

        const steamCmd = injector.resolve(SteamCMD);
        
        const res = steamCmd.buildWsModParams();

        expect(res).to.include('@Test-Mod');
    });

    
    it('SteamCmd-updateMods', async () => {

        fs = memfs(
            {
                'testcwd/testwspath/steamapps/workshop/content': {
                    [SteamCMD['DAYZ_APP_ID']]: {
                        '1234567': {
                            'meta.cpp': 'name = "Test Mod"',
                        },
                    },
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath'
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('testserver');

        const steamCmd = injector.resolve(SteamCMD);

        let calledCount = 0;
        let calledArgs;
        processes.spawnForOutput.callsFake(async (cmd, args, ops) => {
            calledCount++;
            calledArgs = args;
            return {
                status: 0,
                stderr: '',
                stdout: '',
            };
        });

        const res = await steamCmd.updateMods();

        expect(res).to.be.true;
        expect(calledCount).to.equal(1);

        expect(calledArgs).to.include(path.join('/testcwd','testwspath'));
        expect(calledArgs).to.include('1234567');
        expect(calledArgs).to.include(SteamCMD['DAYZ_APP_ID']);

    });

    
    it('SteamCmd-checkMods', async () => {

       fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {
                            '1234567': {
                                'meta.cpp': 'name = "Test Mod"',
                            },
                        },
                    },
                    'testserver': {
                        '@Test-Mod': {},
                    },
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath'
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const res = await steamCmd.checkMods();
        expect(res).to.be.true;
    });

    it('SteamCmd-checkModsNotFound', async () => {

        fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {},
                    },
                    'testserver': {
                        '@Test-Mod': {},
                    },
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath'
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const resNotFound = await steamCmd.checkMods();
        expect(resNotFound).to.be.false;
    });

    it('SteamCmd-checkModsNotInstalled', async () => {

        fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {
                            '1234567': {
                                'meta.cpp': 'name = "Test Mod"',
                            },
                        },
                    },
                    'testserver': {},
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath'
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const resNotInstalled = await steamCmd.checkMods();
        expect(resNotInstalled).to.be.false;
        
    });

    it('SteamCmd-checkMods-NoName', async () => {

        fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {
                            '1234567': {
                                'meta.cpp': '',
                            },
                        },
                    },
                    'testserver': {
                        '@Test-Mod': {},
                    },
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath'
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const resNoName = await steamCmd.checkMods();
        expect(resNoName).to.be.false;
    });

    
    it('SteamCmd-installMods-copy', async () => {
        fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {
                            '1234567': {
                                'meta.cpp': 'name = "Test Mod"',
                                'modKeys': {
                                    'testkey.bikey': 'bikey',
                                }
                            },
                        },
                    },
                    'testserver': {},
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');
        paths.findFilesInDir.resolves([
            `/testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}/1234567/modKeys/testkey.bikey`,
        ]);
        paths.copyDirFromTo.resolves(true);

        manager.config = {
            steamWorkshopPath: 'testwspath',
            linkModDirs: false,
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const res = await steamCmd.installMods();
        expect(res).to.be.true;
        expect(paths.copyDirFromTo.firstCall.args).to.include(path.join('/testcwd', 'testserver', '@Test-Mod'));
        
        expect(fs.readFileSync('/testcwd/testserver/keys/testkey.bikey') + '').to.equal('bikey');
    });

    it('SteamCmd-installMods-link', async () => {
        fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {
                            '1234567': {
                                'meta.cpp': 'name = "Test Mod"',
                                'modKeys': {
                                    'testkey.bikey': 'bikey',
                                }
                            },
                        },
                    },
                    'testserver': {},
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');
        paths.findFilesInDir.resolves([
            `/testcwd/testwspath/steamapps/workshop/content/${SteamCMD['DAYZ_APP_ID']}/1234567/modKeys/testkey.bikey`,
        ]);
        paths.linkDirsFromTo.resolves(true);

        manager.config = {
            steamWorkshopPath: 'testwspath',
            linkModDirs: true,
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const steamCmd = injector.resolve(SteamCMD);

        const res = await steamCmd.installMods();
        expect(res).to.be.true;
        expect(paths.linkDirsFromTo.firstCall.args).to.include(path.join('/testcwd', 'testserver', '@Test-Mod'));
        
        expect(fs.readFileSync('/testcwd/testserver/keys/testkey.bikey') + '').to.equal('bikey');
    });

    it('SteamCmd-updateMods-Error', async () => {

        fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [SteamCMD['DAYZ_APP_ID']]: {
                            '1234567': {
                                'meta.cpp': 'name = "Test Mod"',
                                'modKeys': {
                                    'testkey.bikey': 'bikey',
                                }
                            },
                        },
                    },
                    'testserver': {},
                },
            },
            '/',
            injector,
        );
        paths.cwd.returns('/testcwd');
        
        manager.config = {
            steamWorkshopPath: 'testwspath',
            linkModDirs: true,
        } as any;
        manager.getModIdList.returns(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const spawnStub = processes.spawnForOutput
            .throws({
                status: 10,
                stderr: '',
                stdout: '',
            });

        const steamCmd = injector.resolve(SteamCMD);
        steamCmd['progressLog'] = false;        

        const res = await steamCmd.updateMods();
        expect(res).to.be.false;
        expect(spawnStub.callCount).to.be.greaterThan(1);

    });

});
