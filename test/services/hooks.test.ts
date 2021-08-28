import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-schedule';
import { Hooks } from '../../src/services/hooks';
import { Hook, HookType, HookTypeEnum } from '../../src/config/config';

describe('Test class Hooks', () => {

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

    it('Hooks', async () => {

        const manager = {
            config: {
                hooks: [
                    {
                        type: 'beforeStart',
                        program: 'p1',
                    },
                    {
                        type: 'beforeStart',
                        program: 'p2',
                    }
                ] as Hook[],
            },
            discord: {
                relayRconMessage: sinon.stub(),
            },
        };

        const hooks = new Hooks(manager as any);
        const spawnStub = hooks['processes'].spawnForOutput = sinon.stub();
        spawnStub.withArgs('p1').returns(Promise.resolve({
            status: 0,
            stdout: '',
            stderr: '',
        }));
        spawnStub.withArgs('p2').returns(Promise.resolve({
            status: 1,
            stdout: '',
            stderr: '',
        }));

        await hooks.executeHooks(HookTypeEnum.beforeStart);

        expect(spawnStub.callCount).to.equal(2);
        expect(manager.discord.relayRconMessage.callCount).to.equal(1);

    });

});
