import 'reflect-metadata';

import { expect } from '../expect';
import { StubInstance, disableConsole, enableConsole, fakeChildProcess, fakeHttps, memfs, stubClass } from '../util';
import * as path from 'path';
import * as requestModule from '../../src/util/request';
import { SteamCMD, SteamMetaData } from '../../src/services/steamcmd';
import { DAYZ_APP_ID, DAYZ_SERVER_APP_ID, PublishedFileDetail } from '../../src/types/steamcmd';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Paths } from '../../src/services/paths';
import { Manager } from '../../src/control/manager';
import { Processes } from '../../src/services/processes';
import { FSAPI, HTTPSAPI } from '../../src/util/apis';
import { Downloader } from '../../src/services/download';
import { Config } from '../../src/config/config';
import { ImportMock } from 'ts-mock-imports';
import { EventBus } from '../../src/control/event-bus';

describe('Test class SteamMetaData', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let paths: StubInstance<Paths>;
    let fs: FSAPI;
    let https: StubInstance<HTTPSAPI>;

    before(() => {
        disableConsole();
    });

    after(() => {
        ImportMock.restore();
        enableConsole();
    });

    beforeEach(() => {
        ImportMock.restore();
        container.reset();
        injector = container.createChildContainer();

        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        fakeChildProcess(injector);
        injector.register(Paths, Paths, { lifecycle: Lifecycle.Singleton });
        
        fs = memfs({}, '/', injector);
        https = fakeHttps(injector);

        manager = injector.resolve(Manager) as any;
        paths = injector.resolve(Paths) as any;
    });

    it('SteamMetaData-write-read-local-meta', async () => {
        fs = memfs({}, '/', injector);

        manager.config = {
            m: 'testSteamCmd',
            steamMetaPath: '/metadata'
        } as Partial<Config> as Config;

        const steamMeta = injector.resolve(SteamMetaData);
        
        steamMeta.writeLocalMeta(
            '1234',
            {
                lastDownloaded: 1234
            },
        );
        
        const data = steamMeta.readLocalMeta('1234');

        expect(data?.lastDownloaded).to.equal(1234);
    });

    it('SteamMetaData-update-local-meta', async () => {
        fs = memfs({}, '/', injector);

        manager.config = {
            m: 'testSteamCmd',
            steamMetaPath: '/metadata'
        } as Partial<Config> as Config;

        const steamMeta = injector.resolve(SteamMetaData);
        
        steamMeta.writeLocalMeta(
            '1234',
            {
                lastDownloaded: 1234,
            },
        );

        steamMeta.updateLocalModMeta(
            '1234',
            {
                lastDownloaded: 4321
            },
        );
        
        const data = steamMeta.readLocalMeta('1234');

        expect(data?.lastDownloaded).to.equal(4321);
    });

    it('SteamMetaData-update-local-meta', async () => {
        fs = memfs({}, '/', injector);

        manager.config = {
            m: 'testSteamCmd',
            steamMetaPath: '/metadata'
        } as Partial<Config> as Config;

        const steamMeta = injector.resolve(SteamMetaData);
        
        steamMeta.writeLocalMeta(
            '1234',
            {
                lastDownloaded: 1234,
            },
        );

        steamMeta.updateLocalModMeta(
            '1234',
            {
                lastDownloaded: 4321
            },
        );
        
        const data = steamMeta.readLocalMeta('1234');

        expect(data?.lastDownloaded).to.equal(4321);
    });

    it('SteamMetaData-modNeedsUpdate', async () => {
        fs = memfs({
            'metadata/1234.json': JSON.stringify({
                lastDownloaded: 1234 * 1000,
            }),
            'metadata/4321.json': JSON.stringify({
                lastDownloaded: 4321 * 1000,
            }),
        }, '/', injector);

        manager.config = {
            steamMetaPath: '/metadata'
        } as Partial<Config> as Config;

        const requestStub = ImportMock.mockFunction(requestModule, 'request');
        requestStub.resolves({
            statusCode: 200,
            body: JSON.stringify({
                response: {
                    result: 200,
                    resultcount: 2,
                    publishedfiledetails: [
                        {
                            publishedfileid: '1234',
                            time_updated: 2000,
                        },
                        {
                            publishedfileid: '4321',
                            time_updated: 2000,
                        },
                    ],
                },
            })
        })

        const steamMeta = injector.resolve(SteamMetaData);
        
        const response = await steamMeta.modNeedsUpdate([
            // needs update because remote was updated after last download
            '1234',
            // needs update because local download timestamp is missing
            '5678',
            // does not need update because it was downloaded after the remote was updated
            '4321',
        ]);

        expect(response).to.include('1234');
        expect(response).to.include('5678');
        expect(response).not.to.include('4321');
    });

});

describe('Test class SteamCMD', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let paths: StubInstance<Paths>;
    let processes: StubInstance<Processes>;
    let fs: FSAPI;
    let download: StubInstance<Downloader>;
    let steamMeta: StubInstance<SteamMetaData>;
    let eventBus: EventBus;

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
        injector.register(SteamMetaData, stubClass(SteamMetaData), { lifecycle: Lifecycle.Singleton });
        injector.register(EventBus, EventBus, { lifecycle: Lifecycle.Singleton });

        fs = memfs({}, '/', injector);
        download = injector.resolve(Downloader) as any;
        manager = injector.resolve(Manager) as any;
        paths = injector.resolve(Paths) as any;
        processes = injector.resolve(Processes) as any;
        steamMeta = injector.resolve(SteamMetaData) as any;
        eventBus = injector.resolve(EventBus);
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
        expect(calledArgs).to.include(DAYZ_SERVER_APP_ID);

    });

    it('SteamCmd-modParams', async () => {

        fs = memfs(
            {
                'testcwd/testwspath/steamapps/workshop/content': {
                    [DAYZ_APP_ID]: {
                        '1234567': {
                            'meta.cpp': 'name = "Test Mod"',
                        },
                        '5678901': {
                            'meta.cpp': 'name = "Server Test Mod"',
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
        manager.getServerModIdList.returns(['5678901']);
        manager.getServerPath.returns('testserver');

        const steamCmd = injector.resolve(SteamCMD);
        
        const res = steamCmd.buildWsModParams();
        const resServer = steamCmd.buildWsServerModParams();

        expect(res).to.include('@Test-Mod');
        expect(resServer).to.include('@Server-Test-Mod');
    });

    
    it('SteamCmd-updateMods', async () => {

        const modList = [
            // large mod (first batch, solo download)
            '1234567',
            
            // no meta data (second batch)
            '1111111',
            '2222222',

            // no update needed
            '3333333',
            
            // third batch (not full, needs to be executed seperately)
            '4444444',
        ];

        fs = memfs(
            {
                'testcwd/testwspath/steamapps/workshop/content': {
                    [DAYZ_APP_ID]: {
                        '3333333': {
                            'meta.cpp': 'name = 3333333'
                        }
                    },
                },
            },
            '/',
            injector,
        );
        fs.mkdirSync('testserver/@3333333', { recursive: true });
        paths.cwd.returns('/testcwd');

        manager.config = {
            steamWorkshopPath: 'testwspath',
            updateModsMaxBatchSize: 2,
        } as any;
        manager.getCombinedModIdList.returns(modList);
        manager.getServerPath.returns('testserver');
        steamMeta.modNeedsUpdate.callsFake(async (mods) => mods.filter((x) => x !== '3333333'));
        steamMeta.getModsMetaData.resolves([
            {
                'publishedfileid': '1234567',
                'file_size': String(9_999_999_999),
            } as PublishedFileDetail
        ]);

        const steamCmd = injector.resolve(SteamCMD);

        const spawnStub = processes.spawnForOutput.callsFake(async (cmd, args, ops) => {
            
            const modsBasePath = `/testcwd/testwspath/steamapps/workshop/content/${DAYZ_APP_ID}`;
            for (const modId of modList) {
                fs.mkdirSync(`${modsBasePath}/${modId}`, {recursive: true})
                fs.writeFileSync(
                    `${modsBasePath}/${modId}/meta.cpp`,
                    `name = "Test Mod ${modId}"`
                );
            }
            
            return {
                status: 0,
                stderr: '',
                stdout: '',
            };
        });

        const res = await steamCmd.updateAllMods();

        expect(res).to.be.true;
        expect(spawnStub.callCount).to.equal(3);

        expect(spawnStub.firstCall.args[1]).to.include(path.join('/testcwd','testwspath'));
        expect(spawnStub.firstCall.args[1]).to.include('1234567');
        expect(spawnStub.firstCall.args[1]).to.include(DAYZ_APP_ID);
        
        // check uneven mod cound
        expect(spawnStub.lastCall.args[1]).to.include('4444444');

        // no update needed should not be updated
        expect(
            spawnStub.getCalls().every(call => !call.args[1]?.includes('3333333'))
        ).to.be.true;


    });

    
    it('SteamCmd-checkMods', async () => {

       fs = memfs(
            {
                'testcwd': {
                    'testwspath/steamapps/workshop/content': {
                        [DAYZ_APP_ID]: {
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
        manager.getCombinedModIdList.returns(['1234567']);
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
                        [DAYZ_APP_ID]: {},
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
        manager.getCombinedModIdList.returns(['1234567']);
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
                        [DAYZ_APP_ID]: {
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
        manager.getCombinedModIdList.returns(['1234567']);
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
                        [DAYZ_APP_ID]: {
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
        manager.getCombinedModIdList.returns(['1234567']);
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
                        [DAYZ_APP_ID]: {
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
            `/testcwd/testwspath/steamapps/workshop/content/${DAYZ_APP_ID}/1234567/modKeys/testkey.bikey`,
        ]);
        paths.copyDirFromTo.resolves(true);

        manager.config = {
            steamWorkshopPath: 'testwspath',
            linkModDirs: false,
        } as any;
        manager.getCombinedModIdList.returns(['1234567']);
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
                        [DAYZ_APP_ID]: {
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
            `/testcwd/testwspath/steamapps/workshop/content/${DAYZ_APP_ID}/1234567/modKeys/testkey.bikey`,
        ]);
        paths.linkDirsFromTo.resolves(true);

        manager.config = {
            steamWorkshopPath: 'testwspath',
            linkModDirs: true,
        } as any;
        manager.getCombinedModIdList.returns(['1234567']);
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
                        [DAYZ_APP_ID]: {
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
        manager.getCombinedModIdList.returns(['1234567']);
        steamMeta.modNeedsUpdate.resolves(['1234567']);
        manager.getServerPath.returns('/testcwd/testserver');

        const spawnStub = processes.spawnForOutput
            .throws({
                status: 10,
                stderr: '',
                stdout: '',
            });

        const steamCmd = injector.resolve(SteamCMD);
        steamCmd['progressLog'] = false;        

        const res = await steamCmd.updateAllMods();
        expect(res).to.be.false;
        expect(spawnStub.callCount).to.be.greaterThan(1);

    });

});
