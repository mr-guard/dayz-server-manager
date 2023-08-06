import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports';
import { ConfigParser } from '../../src/util/config-parser';
import { disableConsole, enableConsole } from '../util';

const DEFAULT_CFG = `
hostname = "EXAMPLE NAME";  // Server name
password = "";              // Password to connect to the server
passwordAdmin = "";         // Password to become a server admin

motd[] = { "line1","line2" }; // motd
motd2[] = {};               // motd2
motd3[] = { 1,2,3 };          // motd3

enableWhitelist = 0;        // Enable/disable whitelist (value 0-1)
 
maxPlayers = 60;            // Maximum amount of players
 
verifySignatures = 2;       // Verifies .pbos against .bisign files. (only 2 is supported)
forceSameBuild = 1;         // When enabled, the server will allow the connection only to clients with same the .exe revision as the server (value 0-1)
 
disableVoN = 0;             // Enable/disable voice over network (value 0-1)
vonCodecQuality = 20;        // Voice over network codec quality, the higher the better (values 0-30)
 
disable3rdPerson = 0;         // Toggles the 3rd person view for players (value 0-1)
disableCrosshair = 0;         // Toggles the cross-hair (value 0-1)

disablePersonalLight = 1;   // Disables personal light for all clients connected to server
lightingConfig = 0;         // 0 for brighter night setup, 1 for darker night setup
 
serverTime = "SystemTime";    // Initial in-game time of the server. "SystemTime" means the local time of the machine. Another possibility is to set the time to some value in "YYYY/MM/DD/HH/MM" format, f.e. "2015/4/8/17/23" .
serverTimeAcceleration = 12;  // Accelerated Time (value 0-24)// This is a time multiplier for in-game time. In this case, the time would move 24 times faster than normal, so an entire day would pass in one hour.
serverNightTimeAcceleration = 1;  // Accelerated Nigh Time - The numerical value being a multiplier (0.1-64) and also multiplied by serverTimeAcceleration value. Thus, in case it is set to 4 and serverTimeAcceleration is set to 2, night time would move 8 times faster than normal. An entire night would pass in 3 hours.
serverTimePersistent = 0;     // Persistent Time (value 0-1)// The actual server time is saved to storage, so when active, the next server start will use the saved time value.
 
guaranteedUpdates = 1;        // Communication protocol used with game server (use only number 1)
 
loginQueueConcurrentPlayers = 5;  // The number of players concurrently processed during the login process. Should prevent massive performance drop during connection when a lot of people are connecting at the same time.
loginQueueMaxPlayers = 500;       // The maximum number of players that can wait in login queue
 
instanceId = 1;             // DayZ server instance id, to identify the number of instances per box and their storage folders with persistence files

storeHouseStateDisabled = false;// Disable houses/doors persistence (value true/false), usable in case of problems with persistence
storageAutoFix = 1;         // Checks if the persistence files are corrupted and replaces corrupted ones with empty ones (value 0-1)

 
class Missions
{
    class DayZ
    {
        template="dayzOffline.chernarusplus"; // Mission to load on server startup. <MissionName>.<TerrainName>
					      // Vanilla mission: dayzOffline.chernarusplus
					      // DLC mission: dayzOffline.enoch
    };
};
`;

describe('Test class config parser', () => {

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

    it('ConfigParser-cfg2json-json2cfg', () => {

        const parser = new ConfigParser();
        
        const parsed = parser.cfg2json(DEFAULT_CFG);

        expect(parsed).to.be.not.undefined;
        expect(parsed.hostname).to.equal("EXAMPLE NAME");
        expect(parsed.password).to.equal("");
        expect(parsed.motd.length).to.equal(2);
        expect(parsed.motd[0]).to.equal("line1");
        expect(parsed.motd[1]).to.equal("line2");
        expect(parsed.motd2.length).to.equal(0);
        expect(parsed.disable3rdPerson).to.equal(0);
        expect(parsed.serverTime).to.equal("SystemTime");
        expect(parsed.storeHouseStateDisabled).to.equal(false);
        expect(parsed.storageAutoFix).to.equal(1);
 
        expect(parsed?.Missions?.DayZ?.template).to.equal("dayzOffline.chernarusplus");

        const stringified = parser.json2cfg(parsed);
        expect(stringified).to.be.not.undefined;
        expect(stringified).to.be.not.null;
        expect(stringified).to.contain('hostname="EXAMPLE NAME"');
        expect(stringified).to.contain('password=""');
        expect(stringified).to.contain('motd[]');
        expect(stringified).to.contain('"line1"');
        expect(stringified).to.contain('"line2"');
        expect(stringified).to.contain('motd2[]={}');
        expect(stringified).to.contain('disable3rdPerson=0');
        expect(stringified).to.contain('serverTime="SystemTime"');
        expect(stringified).to.contain('storeHouseStateDisabled=false');
        expect(stringified).to.contain('storageAutoFix=1');
        
    });

});
