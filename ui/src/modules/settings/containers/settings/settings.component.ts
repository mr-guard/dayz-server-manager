import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Config } from '../../../app-common/models';
import { AppCommonService } from '../../../app-common/services/app-common.service';

import configschema from '../../../../../../src/config/config.schema.json';

type ServerCfgKey = keyof typeof configschema.definitions.ServerCfg.properties;

interface Property {
    name: string;
    description: string;
    enum?: (string | number)[];
    type: 'number' | 'string' | 'boolean';
    default: any;
}

@Component({
    selector: 'sb-settings',
    changeDetection: ChangeDetectionStrategy.Default,
    templateUrl: './settings.component.html',
    styleUrls: ['settings.component.scss'],
})
export class SettingsComponent implements OnInit {

    public schema = configschema;

    public config!: Config;
    public loading = true;

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    public serverCfgProps = this.getServerCfgProps();

    public constructor(
        public appCommon: AppCommonService,
    ) {}

    public onSubmit(): void {
        this.loading = true;
        this.appCommon.updateManagerConfig(
            this.config,
        ).toPromise().then(
            () => {
                this.loading = false;
                this.outcomeBadge = {
                    message: 'Successfully updated config',
                    success: true,
                };
            },
            (err) => {
                console.error(err);
                this.loading = false;
                this.outcomeBadge = {
                    message: 'Failed to update config. See manager logs for details',
                    success: false,
                };
            },
        );
    }

    public ngOnInit(): void {
        this.reset();
    }

    public reset(): void {
        this.loading = true;
        this.appCommon.fetchManagerConfig().toPromise().then(
            (config) => {
                this.config = config;
                this.loading = false;
            },
            console.error,
        );
    }

    public addDiscordChannel(): void {
        this.config.discordChannels.push({
            channel: '',
            mode: 'admin',
        });
    }

    public getServerCfgProps(): Property[] {
        return (this.schema.definitions.ServerCfg.propertyOrder as ServerCfgKey[])
            .filter((x) => {
                const { type } = this.schema.definitions.ServerCfg.properties[x];

                const included = ['string', 'number'].includes(type)
                    && !(['motd', 'motdInterval', 'Missions'] as ServerCfgKey[]).includes(x);

                console.log(`${x}: ${included}`);

                return included;
            })
            .map((x) => ({
                ...(this.schema.definitions.ServerCfg.properties[x] as Property),
                name: x,
            }));
    }

}
