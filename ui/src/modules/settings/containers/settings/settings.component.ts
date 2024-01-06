import { Component, OnInit } from '@angular/core';
import { Config, DiscordChannelType } from '../../../app-common/models';
import { AppCommonService } from '../../../app-common/services/app-common.service';
import * as commentJson from 'comment-json';

import configschema from '../../../../../../src/config/config.schema.json';

type ServerCfgKey = keyof typeof configschema.definitions.ServerCfg.properties;

interface Property {
    name: string;
    description: string;
    enum?: (string | number)[];
    type: 'number' | 'string' | 'boolean';
    default: any;
    custom?: boolean;
}

@Component({
    selector: 'sb-settings',
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

    public serverCfgProps?: Property[];

    public constructor(
        public appCommon: AppCommonService,
    ) {}

    public onSubmit(): void {
        this.loading = true;
        this.appCommon.updateManagerConfig(
            commentJson.stringify(this.config),
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
                this.config = commentJson.parse(config) as any;
                if (this.config.discordChannels?.length) {
                    this.config.discordChannels = this.config.discordChannels.map((x) => {
                        if (typeof x.mode === 'string') {
                            x.mode = [x.mode];
                        }
                        return x;
                    })
                }

                if (this.config.serverCfg) {
                    this.serverCfgProps = this.getServerCfgProps(this.config);
                } else {
                    this.serverCfgProps = [];
                }

                this.loading = false;
            },
            console.error,
        );
    }

    public getDiscordChannels(): {
        channel: string;
        mode: DiscordChannelType[];
    }[] {
        return this.config.discordChannels as any;
    }

    public addDiscordChannel(): void {
        this.config.discordChannels.push({
            channel: '',
            mode: ['admin'],
        });
    }

    private getServerCfgProps(config: Config): Property[] {
        const fixedKeys = ['motd', 'motdInterval', 'Missions'] as ServerCfgKey[];

        const known = (this.schema.definitions.ServerCfg.propertyOrder as ServerCfgKey[])
            .filter((x) => {
                const { type } = this.schema.definitions.ServerCfg.properties[x];

                const included = ['string', 'number'].includes(type)
                    && !fixedKeys.includes(x);

                console.log(`${x}: ${included}`);

                return included;
            })
            .map((x) => ({
                ...(this.schema.definitions.ServerCfg.properties[x] as Property),
                name: x,
            }));

        const unknown = Object.keys(config.serverCfg || {})
            .filter((key) => !known.some((knownKey) => knownKey.name === key) && !fixedKeys.includes(key as ServerCfgKey) && ['string', 'number'].includes(typeof config.serverCfg[key]))
            .map((key) => {
                return {
                    name: key as ServerCfgKey,
                    description: '',
                    type: typeof config.serverCfg[key] as 'string' | 'number',
                    default: typeof config.serverCfg[key] === 'string' ? '' : 0,
                    custom: true,
                }
            });

        return [...known, ...unknown];
    }

    public addCustomServerCfgEntry(name: string, type: 'string' | 'number'): void {
        if (!name || name.length < 3) {
            this.outcomeBadge = {
                message: 'Custom field names must be at least 3 characters long',
                success: false,
            };
            return;
        }

        this.serverCfgProps?.push({
            name: name as ServerCfgKey,
            description: '',
            type,
            default: type === 'string' ? '' : 0,
            custom: true,
        });
    }

}
