import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as discordModule from 'discord.js';
import { DiscordBot } from '../../src/services/discord';

describe('Test class Discord', () => {

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

    it('Discord-noToken', async () => {

        const manager = {
            config: {
                discordBotToken: '',
            },
        };

        const discord = new DiscordBot(manager as any);

        await discord.start();

        expect(discord['client']).to.be.undefined;
    });

    it('Discord', async () => {

        const discordClientMock = ImportMock.mockClass<discordModule.Client>(discordModule, 'Client');
        
        const listenerStub = sinon.stub();
        discordClientMock.set('on', listenerStub);

        listenerStub.withArgs('ready').callsArg(1);
        listenerStub.withArgs('invalidated').callsArg(1);
        listenerStub.withArgs('debug').callsArgWith(1, 'testdebug');
        listenerStub.withArgs('warn').callsArgWith(1, 'testwarn');
        listenerStub.withArgs('disconnect').callsArgWith(1, 'testdisconnect');
        listenerStub.withArgs('error').callsArgWith(1, 'testerror');

        let onMessageCb;
        listenerStub.withArgs('message').callsFake((a1, a2) => {
            onMessageCb = a2;
        });

        const loginStub = sinon.stub();
        discordClientMock.set('login', loginStub);

        const destroyStub = sinon.stub();
        discordClientMock.set('destroy', destroyStub);
        const manager = {
            config: {
                discordBotToken: '1234',
            },
        };

        const discord = new DiscordBot(manager as any);
        discord['debug'] = true;
        const messageHandlerStub = sinon.stub(discord['messageHandler'], 'handleCommandMessage');

        await discord.start();

        expect(discord['client']).to.be.not.undefined;
        expect(loginStub.callCount).to.equal(1);

        expect(onMessageCb).to.be.not.undefined;

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
        expect(messageHandlerStub.callCount).to.equal(1);

        await discord.stop();
        expect(destroyStub.callCount).to.equal(1);
        expect(discord['client']).to.be.undefined;

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
        const channels = [channel1, channel2];
        (channels as any).filter2 = channels.filter;
        (channels as any).filter = function (f) {
            const ret = this.filter2(f);
            ret.array = function () { return this; };
            return ret;
        }
        const guilds = {
            first: () => ({ channels })
        };
        discordClientMock.set('guilds', guilds as any);

        const manager = {
            config: {
                discordBotToken: '1234',
                discordChannels: [{
                    mode: 'rcon',
                    channel: 'channel1',
                },{
                    mode: 'admin',
                    channel: 'channel2',
                }]
            },
        };

        const discord = new DiscordBot(manager as any);
        
        // should return instantly
        await discord.relayRconMessage('test');
        
        discord['client'] = discordClientMock.getMockInstance();
        await discord.relayRconMessage('test');

        expect(channel1.send.callCount).to.equal(1);
        expect(channel2.send.callCount).to.equal(0);


    });

});
