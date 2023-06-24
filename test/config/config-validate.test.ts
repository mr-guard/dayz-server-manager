import { ImportMock } from 'ts-mock-imports'
import * as cron from 'cron-parser';
import { parseConfigFileContent, validateConfig } from '../../src/config/config-validate';
import { expect } from '../expect';
import { Config, EventType } from '../../src/config/config';

export const VALID_CONFIG = `{
    // TEST
    "instanceId": "test",
    /**
     * TEST
     */
    "admins": [{
        "userId": "admin",
        "userLevel": "admin",
        "password": "admin"
    },{
        "userId": "moderator",
        "userLevel": "moderate",
        "password": "moderator"
    },{
        "userId": "moderator2",
        "userLevel": "wrong-level",
        "password": "moderator"
    }],
    "rconPassword": "test123",
    "steamUsername": "testuser",
    "serverCfg": {
        "hostname": "Example",
        "maxPlayers": 30,
        "verifySignatures": 2,
        "instanceId": 1,
        "Missions": {
            "DayZ": {
                "template": "test.chernarusplus"
            }
        }
    }
}`;

export const PARSER_ERROR_CONFIG = `{a: 123`;
export const DATA_ERROR_CONFIG = VALID_CONFIG.replace('"instanceId": "test",', '"instanceId": true,');



describe('Test config validate', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('parseConfigFileContent', () => {
        expect(() => parseConfigFileContent(VALID_CONFIG)).not.to.throw();
    });

    it('parseConfigFileContent-malformed', () => {
        expect(() => parseConfigFileContent(PARSER_ERROR_CONFIG)).to.throw();
    });

    it('parseConfigFileContent-empty', () => {
        expect(() => parseConfigFileContent('')).to.throw();
    });

    it('validate-config-positive', () => {
        const base = parseConfigFileContent(VALID_CONFIG);

        const result = validateConfig(base);

        expect(result).to.be.empty;
    });

    it('validate-config-event', () => {
        const base = parseConfigFileContent(VALID_CONFIG) as Config;

        base.events = [
            // no name, wrong type and missing cron
            {
                name: null!,
                type: 'message123' as EventType,
                params: [],
                cron: null!,
            },
            // wrong cron
            {
                name: 'test',
                type: 'message',
                params: [],
                cron: '***',
            }
        ];
        const result = validateConfig(base);

        expect(result.length).to.equal(4);

        expect(result.some(x => x.includes('must specify a name'))).to.be.true;
        expect(result.some(x => x.includes('unknown event type'))).to.be.true;
        expect(result.some(x => x.includes('missing a cron format'))).to.be.true;
        expect(result.some(x => x.includes('invalid cron format'))).to.be.true;
    });
});