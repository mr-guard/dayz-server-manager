import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Config } from '@common/models';
import { AppCommonService } from '@common/services';

import configschema from '../../../../../../src/config/config.schema.json';

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

}
