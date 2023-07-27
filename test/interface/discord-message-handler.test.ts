import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { DiscordMessageHandler } from '../../src/interface/discord-message-handler';
import { StubInstance, disableConsole, enableConsole, stubClass } from '../util';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import { Manager } from '../../src/control/manager';
import { EventBus } from '../../src/control/event-bus';
import { InternalEventTypes } from '../../src/types/events';
import * as sinon from 'sinon';

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


describe('Test Discord Message handler', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let eventBus: EventBus;
    let interfaceServiceExecute: sinon.SinonStub;

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

        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(EventBus, EventBus, { lifecycle: Lifecycle.Singleton });
        
        manager = injector.resolve(Manager) as any;
        manager.initDone = true;
        (manager as any).config = {
            discordChannels: [
                {
                    channel: 'testChannel',
                    mode: 'admin'
                }
            ]
        };

        eventBus = injector.resolve(EventBus) as any;
        eventBus.on(
            InternalEventTypes.INTERFACE_COMMANDS,
            () => new Map([
                ['test', {
                    disableDiscord: false,
                    params: ['arg1', 'arg2']

                }],
                ['testDisabled', { disableDiscord: true }]
            ]) as any,
        );
        interfaceServiceExecute = sinon.stub()
            .resolves({
                status: 200,
                body: 'test success',
            });
        
        eventBus.on(
            InternalEventTypes.INTERFACE_REQUEST,
            interfaceServiceExecute,
        )
    });

    it('handleMessage-before init', async () => {
        manager.initDone = false;

        const handler = injector.resolve(DiscordMessageHandler);
        const message = new TestMessage();

        await handler.handleCommandMessage(message as any);

        expect(message.replyMsg).to.be.undefined;
        expect(interfaceServiceExecute.called).to.be.false;
    });

    it('handleMessage-no command', async () => {
        const handler = injector.resolve(DiscordMessageHandler);
        const message = new TestMessage();
        message.content = 'asdf 1234 123';

        await handler.handleCommandMessage(message as any);

        expect(message.replyMsg).to.include('not found');
        expect(interfaceServiceExecute.called).to.be.false;
    });

    it('handleMessage-discord disabled command', async () => {
        const handler = injector.resolve(DiscordMessageHandler);
        const message = new TestMessage();
        message.content = '!testDisabled';

        await handler.handleCommandMessage(message as any);

        expect(message.replyMsg).to.include('not found');
        expect(interfaceServiceExecute.called).to.be.false;
    });

    it('handleMessage-invalid user', async () => {
        const handler = injector.resolve(DiscordMessageHandler);
        
        const message = new TestMessage();
        message.author.tag = 'asdf';
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.be.undefined;
        expect(interfaceServiceExecute.called).to.be.false;
    });

    it('handleMessage-wrong channel', async () => {
        const handler = injector.resolve(DiscordMessageHandler);
        
        const message = new TestMessage();
        message.channel.name = 'asdf';
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.include('not allowed');
        expect(interfaceServiceExecute.called).to.be.false;
    });

    it('handleMessage-wrong param count', async () => {
        const handler = injector.resolve(DiscordMessageHandler);
        
        const message = new TestMessage();
        message.content = '!test val1';
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.include('Wrong param count');
        expect(interfaceServiceExecute.called).to.be.false;
    });

    it('handleMessage', async () => {
        const handler = injector.resolve(DiscordMessageHandler);
        
        const message = new TestMessage();
        await handler.handleCommandMessage(message as any);
        expect(message.replyMsg).to.include('test success');
        expect(interfaceServiceExecute.called).to.be.true;
    });

    // it('handleMessage-help', async () => {
    //     const handler = injector.resolve(DiscordMessageHandler);
        
    //     const message = new TestMessage();
    //     message.content = '!help';
    //     await handler.handleCommandMessage(message as any);
    //     expect(message.replyMsg).to.include('!test');
    //     expect(interfaceService.execute.called).to.be.false;
    // });

});

