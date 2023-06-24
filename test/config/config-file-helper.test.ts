import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../../src/config/config';
import { disableConsole, enableConsole } from '../util';
import { DATA_ERROR_CONFIG, PARSER_ERROR_CONFIG, VALID_CONFIG } from './config-validate.test';
import { ConfigFileHelper } from '../../src/config/config-file-helper';

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
        
        const resultValid = new ConfigFileHelper().readConfig();
        
        expect(resultValid).to.be.not.null;
    });

    it('Manager-readConfig-Data Error', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', DATA_ERROR_CONFIG);
        
        const resultErrorData = new ConfigFileHelper().readConfig();
        
        expect(resultErrorData).to.be.null;
    });

    it('Manager-readConfig-Parser Error', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', PARSER_ERROR_CONFIG);
        
        const resultErrorParse = new ConfigFileHelper().readConfig();
        
        expect(resultErrorParse).to.be.null;
    });

    it('Manager-readConfig-Empty file', () => {

        ImportMock.mockFunction(fs, 'existsSync', true);
        ImportMock.mockFunction(fs, 'readFileSync', '');
        
        const resultEmpty = new ConfigFileHelper().readConfig();
        
        expect(resultEmpty).to.be.null;
    });

    it('Manager-readConfig-Not existing', () => {
        
        ImportMock.mockFunction(fs, 'existsSync', false);
        ImportMock.mockFunction(fs, 'readFileSync', VALID_CONFIG);
        
        const resultNotExists = new ConfigFileHelper().readConfig();
        
        expect(resultNotExists).to.be.null;
    });

    it('Manager-logConfigErrors', () => {
        const logs = ['test1', 'test2'];
        const configHelper = new ConfigFileHelper();
        let i = 0;
        configHelper['log'].log = () => i++;
        configHelper['logConfigErrors'](logs)
        expect(i).to.be.greaterThanOrEqual(logs.length);
    });

    it('Manager-writeConfig', () => {
        
        const stub = ImportMock.mockFunction(fs, 'writeFileSync');
        
        new ConfigFileHelper().writeConfig(
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
        
        expect(() => new ConfigFileHelper().writeConfig(
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
        
        expect(() => new ConfigFileHelper().writeConfig(
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

});
