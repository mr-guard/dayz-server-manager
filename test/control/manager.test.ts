import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as path from 'path';

import { Manager } from '../../src/control/manager';
import { disableConsole, enableConsole } from '../util';
import { Config } from '../../src/config/config';

const getConfiguredManager = (): Manager => {
    const manager = new Manager(new Config());
    return manager;
};

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

    it('Manager-getServerPath', () => {
        const manager = getConfiguredManager();
        const result = manager.getServerPath();

        manager.config.serverPath = null!;
        const resultDef = manager.getServerPath();

        // Expect result
        expect(result).to.equal(path.join(process.cwd(), 'DayZServer'));
        expect(resultDef).to.equal(path.join(process.cwd(), 'DayZServer'));
    });

    it('Manager-getServerExePath-abs', () => {
        const manager = getConfiguredManager();

        manager.config.serverPath = 'TestDayZServer';
        const resultRel = manager.getServerPath();

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

    // it('Manager-getHooks', () => {
    //     const manager = getConfiguredManager();
    //     manager.config.hooks = null;
    //     const resultUndef = manager.getHooks('beforeStart');
    //     manager.config.hooks = [{
    //         type: 'beforeStart',
    //         program: '',
    //     }];
    //     const result = manager.getHooks('beforeStart');
        
    //     // Expect result
    //     expect(resultUndef).to.be.not.undefined;
    //     expect(resultUndef).to.be.empty;
    //     expect(result).to.be.not.undefined;
    //     expect(result).to.be.not.empty;
    // });

    // it('Manager-getHooks-unknown-type', () => {
    //     const manager = getConfiguredManager();
    //     manager.config.hooks.push({
    //         type: 'beforeStart',
    //         program: '',
    //     });
    //     const resultNotThere = manager.getHooks('what?' as HookType);

    //     // Expect result
    //     expect(resultNotThere).to.be.not.undefined;
    //     expect(resultNotThere).to.be.empty;
    // });

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

});
