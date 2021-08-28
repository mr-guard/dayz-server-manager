import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-schedule';
import { Events } from '../../src/services/events';
import { EventTypeEnum } from '../../src/config/config';
import { ServerState } from '../../src/types/monitor';

describe('Test class Events', () => {

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

    it('Events', async () => {

        const eventTypes = Object.keys(EventTypeEnum);
        const createdTasks: {
            cancel: sinon.SinonStub<any[], any>;
            name: any;
            cron: any;
            action: any;
        }[] = [];
        const cronMock = ImportMock.mockFunction(cron, 'scheduleJob');
        cronMock.callsFake((name, cron, action) => {
            const task = {
                cancel: sinon.stub(),
                nextInvocation: () => new Date(),
                name,
                cron,
                action,
            };
            createdTasks.push(task);
            return task;
        });

        const manager = {
            config: {
                events: eventTypes.map((x) => ({
                    name: x,
                    cron: '* * * * *',
                    type: x,
                    params: ['test']
                }))
            },
            monitor: {
                killServer: sinon.stub(),
                serverState: ServerState.STOPPED,
            },
            rcon: {
                global: sinon.stub(),
                kickAll: sinon.stub(),
                lock: sinon.stub(),
                unlock: sinon.stub(),
            },
            backup: {
                createBackup: sinon.stub(),
            },
            discord: {
                relayRconMessage: (m) => {},
            },
        };

        const events = new Events(manager as any);

        await events.start();
        
        for (const task of createdTasks) {
            await task.action();
        }
        manager.monitor.serverState = ServerState.STARTED;
        for (const task of createdTasks) {
            await task.action();
        }
        
        await events.stop();

        expect(createdTasks.length).to.equal(eventTypes.length);
        expect(createdTasks.every((x) => x.cancel.callCount === 1)).to.be.true;

        expect(manager.monitor.killServer.callCount).to.equal(1);
        expect(manager.rcon.global.callCount).to.equal(1);
        expect(manager.rcon.kickAll.callCount).to.equal(1);
        expect(manager.rcon.lock.callCount).to.equal(1);
        expect(manager.rcon.unlock.callCount).to.equal(1);

        expect(manager.backup.createBackup.callCount).to.equal(2);

    });

});
