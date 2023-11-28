import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import * as sinon from 'sinon';
import * as discordModule from 'discord.js';
import { DiscordBot } from '../../src/services/discord';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { DiscordMessageHandler } from '../../src/interface/discord-message-handler';

describe('Test class Discord', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let messageHandler: StubInstance<DiscordMessageHandler>

    before(() => {
        //disableConsole();
    });

    after(() => {
        //enableConsole();
    });

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();

        container.reset();
        injector = container.createChildContainer();

        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(DiscordMessageHandler, stubClass(DiscordMessageHandler), { lifecycle: Lifecycle.Singleton });

        manager = injector.resolve(Manager) as any;
        messageHandler = injector.resolve(DiscordMessageHandler) as any;
        (messageHandler as any).PREFIX = '!';
    });

    it('Discord-noToken', async () => {

        manager.config = {
            discordBotToken: '',
        } as any;

        const discord = injector.resolve(DiscordBot);

        await discord.start();

        expect(discord.client).to.be.undefined;
    });

    it('Discord', async () => {

        const discordClientMock = ImportMock.mockClass<discordModule.Client>(discordModule, 'Client');
        
        const listenerStub = sinon.stub();
        discordClientMock.set('on', listenerStub);

        let onReadyCb;
        listenerStub.withArgs('ready').callsFake((a1, a2) => {
            onReadyCb = a2;
        });;
        listenerStub.withArgs('invalidated').callsArg(1);
        listenerStub.withArgs('debug').callsArgWith(1, 'testdebug');
        listenerStub.withArgs('warn').callsArgWith(1, 'testwarn');
        listenerStub.withArgs('disconnect').callsArgWith(1, 'testdisconnect');
        listenerStub.withArgs('error').callsArgWith(1, 'testerror');

        let onMessageCb;
        listenerStub.withArgs('messageCreate').callsFake((a1, a2) => {
            onMessageCb = a2;
        });

        const loginStub = sinon.stub();
        discordClientMock.set('login', loginStub);

        const destroyStub = sinon.stub();
        discordClientMock.set('destroy', destroyStub);
        
        manager.config = {
            discordBotToken: '1234',
        } as any;

        const discord = injector.resolve(DiscordBot);
        discord.debug = true;
        
        await discord.start();

        expect(discord.client).to.be.not.undefined;
        expect(loginStub.callCount).to.equal(1);

        expect(onMessageCb).to.be.not.undefined;
        expect(onReadyCb).to.be.not.undefined;
        
        discord.client!.guilds = { cache: new discordModule.Collection() } as any;
        await onReadyCb();
 
        onMessageCb({
            author: {
                bot: true,
            },
            content: 'bot'
        });

        onMessageCb({
            author: {
                bot: false,
            },
            content: 'something'
        });

        onMessageCb({
            author: {
                bot: false,
            },
            content: '!test'
        });
        expect(messageHandler.handleCommandMessage.callCount).to.equal(1);

        await discord.stop();
        expect(destroyStub.callCount).to.equal(1);
        expect(discord.client).to.be.undefined;

    });


    it('Discord-relayMessage', async () => {

        const discordClientMock = ImportMock.mockClass<discordModule.Client>(discordModule, 'Client');
        
        const channel1 = {
            name: 'channel1',
            send: sinon.stub(),
        };
        const channel2 = {
            name: 'channel2',
            send: sinon.stub(),
        };
        const channels = { cache: [channel1, channel2] };
        (channels as any).cache.filter2 = channels.cache.filter;
        (channels as any).cache.filter = function (f) {
            const ret = this.filter2(f);
            ret.array = function () { return this; };
            return ret;
        }
        const guilds = {
            cache: {
                first: () => ({ channels })
            }
        };
        discordClientMock.set('guilds', guilds as any);

        manager.config = {
            discordBotToken: '1234',
            discordChannels: [{
                mode: 'rcon',
                channel: 'channel1',
            },{
                mode: 'admin',
                channel: 'channel2',
            }]
        } as any;

        const discord = injector.resolve(DiscordBot);
        discord['ready'] = true;
        
        // should return instantly
        await discord.sendMessage({ type: 'rcon', message: 'test' });
        
        discord.client = discordClientMock.getMockInstance();
        await discord.sendMessage({ type: 'rcon', message: 'test' });

        expect(channel1.send.callCount).to.equal(1);
        expect(channel2.send.callCount).to.equal(0);


    });

});
