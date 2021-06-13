import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { disableConsole, enableConsole } from '../util';
import * as sinon from 'sinon';
import * as fse from 'fs-extra';
import * as path from 'path';
import { MissionFiles } from '../../src/services/mission-files';

describe('Test class MissionFiles', () => {

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

    it('MissionFiles-read', async () => {

        const readMock = ImportMock.mockFunction(fse, 'readFile');
        readMock.withArgs(
            path.join(
                'testserver',
                'mpmissions',
                'dayz.chernarusplus',
                'test.txt',
            )
        ).returns('test');

        const manager = {
            getServerPath: () => 'testserver',
            config: {
                serverCfg: {
                    Missions: {
                        DayZ: {
                            template: 'dayz.chernarusplus',
                        },
                    },
                },
            },
        } as any;

        const files = new MissionFiles(manager);

        const content = await files.readMissionFile('test.txt');

        expect(content).to.equal('test');

    });

    it('MissionFiles-readDir', async () => {

        const readMock = ImportMock.mockFunction(fse, 'readdir');
        readMock.withArgs(
            path.join(
                'testserver',
                'mpmissions',
                'dayz.chernarusplus',
                '/'
            )
        ).returns([{
            name: 'test',
            isDirectory: () => true,
        },{
            name: 'testfile',
            isDirectory: () => false,
        }]);

        const manager = {
            getServerPath: () => 'testserver',
            config: {
                serverCfg: {
                    Missions: {
                        DayZ: {
                            template: 'dayz.chernarusplus',
                        },
                    },
                },
            },
        } as any;

        const files = new MissionFiles(manager);

        const content = await files.readMissionDir('/');

        expect(content.length).to.equal(2);
        expect(content).to.include('test/');
        expect(content).to.include('testfile');

    });

    it('MissionFiles-write', async () => {

        const writeMock = ImportMock.mockFunction(fse, 'writeFile');
        
        const manager = {
            getServerPath: () => 'testserver',
            config: {
                serverCfg: {
                    Missions: {
                        DayZ: {
                            template: 'dayz.chernarusplus',
                        },
                    },
                },
            },
        } as any;

        const files = new MissionFiles(manager);

        await files.writeMissionFile('test.txt', 'test');

        expect(writeMock.callCount).to.equal(1);

    });

});
