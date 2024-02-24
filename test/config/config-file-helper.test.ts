import 'reflect-metadata';

import { expect } from '../expect';
import * as sinon from 'sinon';
import * as commentJson from 'comment-json';
import { Config } from '../../src/config/config';
import { disableConsole, enableConsole, memfs, stubClass } from '../util';
import { DATA_ERROR_CONFIG, PARSER_ERROR_CONFIG, VALID_CONFIG } from './config-validate.test';
import { ConfigFileHelper } from '../../src/config/config-file-helper';
import { container, DependencyContainer, Lifecycle } from 'tsyringe';
import { FSAPI } from '../../src/util/apis';
import { LoggerFactory } from '../../src/services/loggerfactory';
import { Paths } from '../../src/services/paths';

describe('Test class ConfigFileHelper', () => {

    let files: FSAPI;
    let injector: DependencyContainer;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer()
        files = memfs({}, '/', injector);
        injector.register(LoggerFactory, LoggerFactory);
        injector.register(Paths, stubClass(Paths), { lifecycle: Lifecycle.Singleton });
        
        (injector.resolve(Paths).cwd as sinon.SinonStub).returns('/');
    });

    it('ConfigFileHelper-readConfig', () => {
        
        memfs({ ['/' + ConfigFileHelper.CFG_NAME]: VALID_CONFIG }, '/', injector);
        
        const resultValid = injector.resolve(ConfigFileHelper).readConfig();
        
        expect(resultValid).to.be.not.null;
    });

    it('ConfigFileHelper-readConfig-Data Error', () => {

        memfs({ ['/' + ConfigFileHelper.CFG_NAME]: DATA_ERROR_CONFIG }, '/', injector);

        const resultErrorData = injector.resolve(ConfigFileHelper).readConfig();
        
        expect(resultErrorData).to.be.null;
    });

    it('ConfigFileHelper-readConfig-Parser Error', () => {

        memfs({ ['/' + ConfigFileHelper.CFG_NAME]: PARSER_ERROR_CONFIG }, '/', injector);
        
        const result = injector.resolve(ConfigFileHelper).readConfig();
        
        expect(result).to.be.null;
    });

    it('ConfigFileHelper-readConfig-Empty file', () => {

        memfs({ ['/' + ConfigFileHelper.CFG_NAME]: '' }, '/', injector);
        
        const result = injector.resolve(ConfigFileHelper).readConfig();
        
        expect(result).to.be.null;
    });

    it('ConfigFileHelper-readConfig-Not existing', () => {
        
        const resultNotExists = injector.resolve(ConfigFileHelper).readConfig();
        
        expect(resultNotExists).to.be.null;
    });

    it('ConfigFileHelper-writeConfig', () => {
        const helper = injector.resolve(ConfigFileHelper);
        
        helper.writeConfig(
            commentJson.stringify(
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
            ),
        );

        // Expect result
        const cfgPath = helper.getConfigFilePath();
        expect(files.existsSync(cfgPath)).to.be.true;

        const cfgContent = files.readFileSync(cfgPath) + '';
        expect(cfgContent).to.include('test-instance');
        expect(cfgContent).to.include('test123');
        expect(cfgContent).to.include('test-admin');
        expect(cfgContent).to.include('testuser');
    });

    it('ConfigFileHelper-writeConfig-errors', () => {
        
        const helper = injector.resolve(ConfigFileHelper);
        
        expect(() => helper.writeConfig(
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
        const cfgPath = helper.getConfigFilePath();
        expect(files.existsSync(cfgPath)).to.be.false;
        
    });

    it('ConfigFileHelper-writeConfig-io-errors', () => {
        
        const stub = sinon.stub(files, 'writeFileSync').throwsException();
        
        expect(() => injector.resolve(ConfigFileHelper).writeConfig(
            commentJson.stringify(
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
            ),
        )).to.throw();

        // Expect result
        expect(stub.callCount).to.equal(1);
        
    });

    it('ConfigFileHelper-writeConfig', () => {
        const helper = injector.resolve(ConfigFileHelper);
        
        helper.createDefaultConfig();

        // Expect result
        const cfgPath = helper.getConfigFilePath();
        expect(files.existsSync(cfgPath)).to.be.true;

        const config = helper.readConfig();
        expect(config?.admins[0].password).not.to.equal('admin');
    });

});
