import { Manager } from '../control/manager';
import { IService } from '../types/service';
import { Logger } from '../util/logger';
import * as path from 'path';
import * as fse from 'fs-extra';

export class MissionFiles implements IService {

    private log = new Logger('MissionFiles');

    public constructor(
        public manager: Manager,
    ) {}

    public getMissionPath(): string {
        return path.join(
            this.manager.getServerPath(),
            'mpmissions',
            this.manager.config.serverCfg.Missions.DayZ.template,
        );
    }

    public async readMissionFile(file: string): Promise<string> {
        const filePath = path.join(
            this.getMissionPath(),
            file,
        );
        return String(await fse.readFile(filePath));
    }

    public async writeMissionFile(file: string, content: string): Promise<void> {
        const filePath = path.join(
            this.getMissionPath(),
            file,
        );
        await fse.writeFile(filePath, content);
    }

}
