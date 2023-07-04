import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import * as sinon from 'sinon';
import * as chokidarModule from 'chokidar';
import * as path from 'path';
import { ConfigWatcher } from '../../src/services/config-watcher';
import { DependencyContainer, container } from 'tsyringe';
import { ConfigFileHelper } from '../../src/config/config-file-helper';
import { CHOKIDAR, InjectionTokens } from '../../src/util/apis';
import { Config } from '../../src/config/config';

describe('Test class ConfigWatcher', () => {

    let injector: DependencyContainer;

    let configFileHelper: StubInstance<ConfigFileHelper>;
    let chokidar: StubInstance<CHOKIDAR>;

    before(() => {
        disableConsole();
    });

    after(() => {
        enableConsole();
    });

    beforeEach(() => {
        container.reset();
        injector = container.createChildContainer();

        injector.register(InjectionTokens.chokidar, { useValue: ({ watch: sinon.stub() }) });
        injector.register(ConfigFileHelper, stubClass(ConfigFileHelper));

        chokidar = injector.resolve(InjectionTokens.chokidar);
        configFileHelper = injector.resolve(ConfigFileHelper) as any;
    });

    it('ConfigWatcher', async () => {

        let changeCb: Function;
        const watcher = {
            on: sinon.stub(),
            close: sinon.stub(),
        } as any as StubInstance<chokidarModule.FSWatcher>;
        watcher.on.callsFake((t, c) => {
            if (t === 'change') {
                changeCb = c;
            }
            return watcher;
        });
        chokidar.watch.returns(watcher);

        configFileHelper.getConfigFilePath.returns('test');
        configFileHelper.readConfig.returns(new Config());

        const configWatcher = injector.resolve(ConfigWatcher);
        configWatcher['changeDetectionDelay'] = 1;

        const onChanged = sinon.stub();

        configWatcher.watch(onChanged);
        expect(changeCb!).not.to.be.undefined;

        // dont except callback when nothing is changed
        changeCb!();
        await new Promise((r) => setTimeout(r, 10));
        expect(onChanged.callCount).to.equal(0);

        const newConf = new Config();
        newConf.instanceId = '9999';
        configFileHelper.readConfig.returns(newConf);
        changeCb!();
        await new Promise((r) => setTimeout(r, 10));
        expect(onChanged.callCount).to.equal(1);

        configWatcher.stopWatching();
        expect(watcher.close.callCount).to.equal(1);

    });

});
