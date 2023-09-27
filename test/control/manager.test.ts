import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as path from 'path';

import { Manager } from '../../src/control/manager';
import { StubInstance, disableConsole, enableConsole, memfs, stubClass } from '../util';
import { Config } from '../../src/config/config';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Paths } from '../../src/services/paths';
import { FSAPI } from '../../src/util/apis';

const defaultAdmins = [{
    userId: "admin",
    userLevel: "admin",
    password: "admin"
},{
    userId: "moderator",
    userLevel: "moderate",
    password: "moderator"
},{
    userId: "moderator2",
    userLevel: "wrong-level" as any,
    password: "moderator"
}];

describe('Test class Manager', () => {

    let injector: DependencyContainer;

    let paths: StubInstance<Paths>;
    let fs: FSAPI;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();

        container.reset();
        injector = container.createChildContainer();

        injector.register(Paths, stubClass(Paths), { lifecycle: Lifecycle.Singleton });
        
        paths = injector.resolve(Paths) as any;
        paths.cwd.returns(process.cwd());
        fs = memfs({}, '/', injector);
    });

    const getConfiguredManager = (): Manager => {
        const manager = injector.resolve(Manager);
        manager.config = new Config();
        return manager;
    };

    it('Manager-getServerPath', () => {
        const manager = getConfiguredManager();
        const result = manager.getServerPath();

        manager.config.serverPath = null!;
        const resultDef = manager.getServerPath();

        // Expect result
        expect(result).to.equal(path.join(process.cwd(), 'DayZServer'));
        expect(resultDef).to.equal(path.join(process.cwd(), 'DayZServer'));
    });

    it('Manager-getProfilesPath', () => {
        const manager = getConfiguredManager();
        const result = manager.getProfilesPath();

        manager.config.serverPath = null!;
        const resultDef = manager.getProfilesPath();

        // Expect result
        expect(result).to.equal(path.join(process.cwd(), 'DayZServer', 'profiles'));
        expect(resultDef).to.equal(path.join(process.cwd(), 'DayZServer', 'profiles'));
    });

    it('Manager-getServerExePath-abs', () => {
        const manager = getConfiguredManager();

        manager.config.serverPath = 'TestDayZServer';
        const resultRel = manager.getServerPath();

        paths.isAbsolute.returns(true);
        manager.config.serverPath = 'C:/TestDayZServer';
        const resultAbs = manager.getServerPath();

        // Expect result
        expect(resultRel).to.equal(path.join(process.cwd(), 'TestDayZServer'));
        expect(resultAbs).to.equal('C:/TestDayZServer');
    });

    it('Manager-getServerExePath', () => {
        const manager = getConfiguredManager();

        manager.config.serverPath = 'TestDayZServer';
        manager.config.serverExe = 'Test.exe';
        const result = manager.getServerExePath();

        // Expect result
        expect(result).to.equal(path.join(process.cwd(), 'TestDayZServer', 'Test.exe'));
    });

    it('Manager-getUserLevel', () => {
        const userId = 'moderator';
        const manager = getConfiguredManager();
        manager.config.admins = defaultAdmins;

        // Method call
        const result = manager.getUserLevel(userId);

        // Expect result
        expect(result).to.be.equal('moderate');
    });

    it('Manager-isUserOfLevel-userlevel-is-greater', () => {
        const userId = 'admin';
        const level = 'moderate';
        const manager = getConfiguredManager();
        manager.config.admins = defaultAdmins;

        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.true;
    });

    it('Manager-isUserOfLevel-userlevel-is-lower', () => {
        const userId = 'moderator';
        const level = 'admin';
        const manager = getConfiguredManager();
        manager.config.admins = defaultAdmins;

        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.false;
    });

    it('Manager-isUserOfLevel-userlevel-unknown', () => {
        const userId = 'moderator2';
        const level = 'view';
        const manager = getConfiguredManager();
        manager.config.admins = defaultAdmins;

        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.false;
    });

    it('Manager-isUserOfLevel-unknown user', () => {
        const userId = 'unknown';
        const level = 'admin';
        const manager = getConfiguredManager();
        manager.config.admins = defaultAdmins;

        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.false;
    });

    it('Manager-isUserOfLevel-no level', () => {
        const userId = 'unknown';
        const manager = getConfiguredManager();
        manager.config.admins = defaultAdmins;
        
        const result = manager.isUserOfLevel(userId, null!);

        expect(result).to.be.true;
    });

    it('Manager-getWebPort-default', () => {
        const manager = getConfiguredManager();
        const result = manager.getWebPort();

        // Expect result
        expect(result).to.be.equal(manager.config.serverPort + 11);
    });

    it('Manager-getWebPort', () => {
        const manager = getConfiguredManager();
        manager.config.webPort = 9999;
        const result = manager.getWebPort();

        // Expect result
        expect(result).to.be.equal(9999);
    });

    it('Manager-getServerInfo', () => {
        const manager = getConfiguredManager();
        const result = manager.getServerInfo();

        // Expect result
        expect(result).to.be.not.undefined;
    });

    it('Manager-getModList', () => {
        const manager = getConfiguredManager();
        manager.config.steamWsMods = [
            'mod1',
            {
                workshopId: 'mod2'
            },
            ''
        ];
        const result = manager.getModIdList();

        // Expect result
        expect(result).to.lengthOf(2);
        expect(result).to.contain('mod1');
        expect(result).to.contain('mod2');
    });

    it('Manager-getServerModList', () => {
        const manager = getConfiguredManager();
        manager.config.steamWsServerMods = [
            'mod1',
            {
                workshopId: 'mod2'
            },
            ''
        ];
        const result = manager.getServerModIdList();

        // Expect result
        expect(result).to.lengthOf(2);
        expect(result).to.contain('mod1');
        expect(result).to.contain('mod2');
    });

    
    it('Manager-getCombinedModList', () => {
        const manager = getConfiguredManager();
        manager.config.steamWsServerMods = [
            'mod-server',
            ''
        ];
        manager.config.steamWsMods = [
            'mod',
            ''
        ];
        const result = manager.getCombinedModIdList();

        // Expect result
        expect(result).to.lengthOf(2);
        expect(result).to.contain('mod-server');
        expect(result).to.contain('mod');
    });

});
