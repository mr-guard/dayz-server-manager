import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { DiscordMessageHandler } from '../../src/interface/discord-message-handler';
import { disableConsole, enableConsole } from '../util';

class TestMessage {

    author = {
        tag: '#admin'
    };
    content = '!test val1 val2';
    channel = { name: 'testChannel' };

    
    replyMsg: string;
    public reply(msg: string): void {
        this.replyMsg = msg;
    }

}

class TestManager {
    execResponse = {
        status: 200,
        body: 'test success',
    };
    executed: any;
    interface = {
        commandMap: new Map([
            ['test', {
                disableDiscord: false,
                params: ['arg1', 'arg2']

            }],
            ['testDisabled', { disableDiscord: true }]
        ]),
        execute: (req) => {
            this.executed = req;
            return this.execResponse;
        },
    };
    config = {
        discordChannels: [
            {
                channel: 'testChannel',
                mode: 'admin'
            }
        ]
    };
    initDone = true;
}


describe('Test Discord Message handler', () => {

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

    it('handleMessage-before init', async () => {
        const manager = new TestManager();
        manager.initDone = false;

        const handler = new DiscordMessageHandler(manager as any, null)
        const message = new TestMessage();

        await handler.handleCommandMessage(message as any);

        expect(message.replyMsg).to.be.undefined;
        expect(manager.executed).to.be.undefined;
    });

    it('handleMessage-no command', async () => {
        const manager = new TestManager();
        const handler = new DiscordMessageHandler(manager as any, null)
        const message = new TestMessage();
        message.content = 'asdf 1234 123';

        await handler.handleCommandMessage(message as any);

        expect(message.replyMsg).to.include('not found');
        expect(manager.executed).to.be.undefined;
    });

    it('handleMessage-discord disabled command', async () => {
        const manager = new TestManager();
        const handler = new DiscordMessageHandler(manager as any, null)
        const message = new TestMessage();
        message.content = '!testDisabled';

        await handler.handleCommandMessage(message as any);

        expect(message.replyMsg).to.include('not found');
        expect(manager.executed).to.be.undefined;
    });

    it('handleMessage-invalid user', async () => {
        const manager = new TestManager();
        const handler = new DiscordMessageHandler(manager as any, null)
        
        const message = new TestMessage();
        message.author.tag = 'asdf';
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.be.undefined;
        expect(manager.executed).to.be.undefined;
    });

    it('handleMessage-wrong channel', async () => {
        const manager = new TestManager();
        const handler = new DiscordMessageHandler(manager as any, null)
        
        const message = new TestMessage();
        message.channel.name = 'asdf';
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.include('not allowed');
        expect(manager.executed).to.be.undefined;
    });

    it('handleMessage-wrong param count', async () => {
        const manager = new TestManager();
        const handler = new DiscordMessageHandler(manager as any, null)
        
        const message = new TestMessage();
        message.content = '!test val1';
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.include('Wrong param count');
        expect(manager.executed).to.be.undefined;
    });

    it('handleMessage', async () => {
        const manager = new TestManager();
        const handler = new DiscordMessageHandler(manager as any, null)
        
        const message = new TestMessage();
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.include('test success');
        expect(manager.executed).to.be.not.undefined;
    });

});

