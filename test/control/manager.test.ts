import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as fs from 'fs';
import * as path from 'path';

import { Manager } from '../../src/control/manager';
import { Config, HookType } from '../../src/config/config';
import { disableConsole, enableConsole } from '../util';
import { DATA_ERROR_CONFIG, PARSER_ERROR_CONFIG, VALID_CONFIG } from '../config/config-validate.test';

const getConfiguredManager = (): Manager => {
    ImportMock.mockFunction(fs, 'existsSync', true);
    ImportMock.mockFunction(fs, 'readFileSync', VALID_CONFIG);
    
    const manager = new Manager();
    manager.readConfig();

    return manager;
};


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

    it('Manager-readConfig', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', VALID_CONFIG);
        
        const manager = new Manager();
        const resultValid = manager.readConfig();
        
        expect(resultValid).to.be.true;
    });

    it('Manager-readConfig-Data Error', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', DATA_ERROR_CONFIG);
        const manager = new Manager();
        
        const resultErrorData = manager.readConfig();
        expect(resultErrorData).to.be.false;
    });

    it('Manager-readConfig-Parser Error', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', PARSER_ERROR_CONFIG);
        const manager = new Manager();
        const resultErrorParse = manager.readConfig();
        expect(resultErrorParse).to.be.false;
    });

    it('Manager-readConfig-Empty file', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', '');
        const manager = new Manager();
        const resultEmpty = manager.readConfig();
        expect(resultEmpty).to.be.false;
    });

    it('Manager-readConfig-Not existing', () => {
        
        ImportMock.mockFunction(fs, 'existsSync', false);
        ImportMock.mockFunction(fs, 'readFileSync', VALID_CONFIG);
        const manager = new Manager();
        const resultNotExists = manager.readConfig();
        expect(resultNotExists).to.be.false;
    });

    it('Manager-logConfigErrors', () => {
        const logs = ['test1', 'test2'];
        const manager = new Manager();
        let i = 0;
        manager['log'].log = () => i++;
        manager['logConfigErrors'](logs)
        expect(i).to.be.greaterThanOrEqual(logs.length);
    });

    it('Manager-writeConfig', () => {
        
        const stub = ImportMock.mockFunction(fs, 'writeFileSync');
        
        const manager = new Manager();
        manager.writeConfig(
            Object.assign(
                new Config(),
                <Partial<Config>>{
                    instanceId: 'test-instance',
                    admins: [{
                        userId: 'test-admin',
                        userLevel: 'admin',
                        password: 'admin'
                    }],
                    rconPassword: 'test123',
                    steamUsername: 'testuser'
                }
            ),
        );

        // Expect result
        expect(stub.callCount).to.equal(1);
        expect(stub.firstCall.args[0]).to.equal(path.join(process.cwd(), 'server-manager.json'));
        expect(stub.firstCall.args[1]).to.include('test-instance');
        expect(stub.firstCall.args[1]).to.include('test123');
        expect(stub.firstCall.args[1]).to.include('test-admin');
        expect(stub.firstCall.args[1]).to.include('testuser');
    });

    it('Manager-writeConfig-errors', () => {
        
        const stub = ImportMock.mockFunction(fs, 'writeFileSync');
        
        const manager = new Manager();
        
        expect(() => manager.writeConfig(
            Object.assign(
                new Config(),
                {
                    instanceId: false,
                    admins: [{
                        userId: 'test-admin',
                        userLevel: 'admin',
                        password: 'admin'
                    }],
                    rconPassword: 'test123',
                    steamUsername: 'testuser'
                }
            ),
        )).to.throw();

        // Expect result
        expect(stub.callCount).to.equal(0);
        
    });

    it('Manager-writeConfig-io-errors', () => {
        
        const stub = ImportMock.mockFunction(fs, 'writeFileSync');
        stub.throwsException();
        
        const manager = new Manager();
        
        expect(() => manager.writeConfig(
            Object.assign(
                new Config(),
                {
                    instanceId: 'test',
                    admins: [{
                        userId: 'test-admin',
                        userLevel: 'admin',
                        password: 'admin'
                    }],
                    rconPassword: 'test123',
                    steamUsername: 'testuser'
                }
            ),
        )).to.throw();

        // Expect result
        expect(stub.callCount).to.equal(1);
        
    });

    it('Manager-getServerPath', () => {
        const manager = getConfiguredManager();
        const result = manager.getServerPath();

        manager.config.serverPath = null;
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

        // Method call
        const manager = getConfiguredManager();
        const result = manager.getUserLevel(userId);

        // Expect result
        expect(result).to.be.equal('moderate');
    });

    it('Manager-isUserOfLevel-userlevel-is-greater', () => {
        const userId = 'admin';
        const level = 'moderate';

        const manager = getConfiguredManager();
        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.true;
    });

    it('Manager-isUserOfLevel-userlevel-is-lower', () => {
        const userId = 'moderator';
        const level = 'admin';

        const manager = getConfiguredManager();
        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.false;
    });

    it('Manager-isUserOfLevel-userlevel-unknown', () => {
        const userId = 'moderator2';
        const level = 'view';

        const manager = getConfiguredManager();
        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.false;
    });

    it('Manager-isUserOfLevel-unknown user', () => {
        const userId = 'unknown';
        const level = 'admin';

        const manager = getConfiguredManager();
        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.false;
    });

    it('Manager-isUserOfLevel-no level', () => {
        const userId = 'unknown';
        const level = null;

        const manager = getConfiguredManager();
        const result = manager.isUserOfLevel(userId, level);

        expect(result).to.be.true;
    });

    it('Manager-getHooks', () => {
        const manager = getConfiguredManager();
        manager.config.hooks = null;
        const resultUndef = manager.getHooks('beforeStart');
        manager.config.hooks = [{
            type: 'beforeStart',
            program: '',
        }];
        const result = manager.getHooks('beforeStart');
        
        // Expect result
        expect(resultUndef).to.be.not.undefined;
        expect(resultUndef).to.be.empty;
        expect(result).to.be.not.undefined;
        expect(result).to.be.not.empty;
    });

    it('Manager-getHooks-unknown-type', () => {
        const manager = getConfiguredManager();
        manager.config.hooks.push({
            type: 'beforeStart',
            program: '',
        });
        const resultNotThere = manager.getHooks('what?' as HookType);

        // Expect result
        expect(resultNotThere).to.be.not.undefined;
        expect(resultNotThere).to.be.empty;
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

    it('Manager-getIngameToken', () => {
        // Method call
        const manager = getConfiguredManager();
        const result = manager.getIngameToken();

        // Expect result
        expect(result).to.match(/DZSM-\d+-\d+-\d+/g);
    });

    it('Manager-initDone', () => {
        const manager = new Manager();
        const resultBefore = manager.initDone;
        manager.initDone = true;
        const resultAfter = manager.initDone;

        // Expect result
        expect(resultBefore).to.be.false;
        expect(resultAfter).to.be.true;
    });

});
