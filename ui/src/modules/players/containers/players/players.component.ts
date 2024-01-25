import { Component, OnInit } from '@angular/core';
import { PlayersService } from '../../services/players.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'sb-players',
    templateUrl: './players.component.html',
    styleUrls: ['players.component.scss'],
})
export class PlayersComponent implements OnInit {

    public activeTab = 1;

    private _steam64Input: string = '';
    public set steam64Input(id: string) {
        this._steam64Input = id;
        if (id?.length === 17) {
            this._dayzId = this.playerService.steam64ToDayZID(id);
            this._beGuid = this.playerService.steam64ToBEGUID(id);
        } else {
            this._dayzId = '';
            this._beGuid = '';
        }
    }
    public get steam64Input(): string {
        return this._steam64Input;
    }
    private _dayzId: string = '';
    public get dayzId(): string {
        return this._dayzId;
    }
    public set dayzId(value: string) {
        this._dayzId = value;
        this._steam64Input = '';
        this._beGuid = '';
    }
    private _beGuid: string = '';
    public get beGuid(): string {
        return this._beGuid;
    }
    public set beGuid(value: string) {
        this._beGuid = value;
        this._dayzId = '';
        this._steam64Input = '';
    }

    private sub?: Subscription;

    public constructor(
        public playerService: PlayersService,
    ) {}

    public ngOnInit(): void {
        this.sub = this.playerService.selected$.subscribe((x) => {
            this.steam64Input = x?.steamid || '';
        });
    }

    public ngOnDestroy(): void {
        if (this.sub && !this.sub?.closed) {
            this.sub.unsubscribe();
            this.sub = undefined;
        }
    }

    public async ban(): Promise<void> {
        if (this.steam64Input?.length !== 17 && this.dayzId?.length !== 44) return;
        await this.playerService.ban(this.steam64Input || this.dayzId).toPromise();
        await this.playerService.loadLists();
    }
    public async unban(): Promise<void> {
        if (this.steam64Input?.length !== 17 && this.dayzId?.length !== 44) return;
        await this.playerService.unban(this.steam64Input || this.dayzId).toPromise();
        await this.playerService.loadLists();
    }
    public async whitelist(): Promise<void> {
        if (this.steam64Input?.length !== 17 && this.dayzId?.length !== 44) return;
        await this.playerService.whitelist(this.steam64Input || this.dayzId).toPromise();
        await this.playerService.loadLists();
    }
    public async unwhitelist(): Promise<void> {
        if (this.steam64Input?.length !== 17 && this.dayzId?.length !== 44) return;
        await this.playerService.unwhitelist(this.steam64Input || this.dayzId).toPromise();
        await this.playerService.loadLists();
    }
    public async prio(): Promise<void> {
        if (this.steam64Input?.length !== 17 && this.dayzId?.length !== 44) return;
        await this.playerService.prio(this.steam64Input || this.dayzId).toPromise();
        await this.playerService.loadLists();
    }
    public async unprio(): Promise<void> {
        if (this.steam64Input?.length !== 17 && this.dayzId?.length !== 44) return;
        await this.playerService.unprio(this.steam64Input || this.dayzId).toPromise();
        await this.playerService.loadLists();
    }

    public async reloadRconBans(): Promise<void> {
        await this.playerService.reloadRconBans().toPromise();
        await this.playerService.loadLists();
    }

}
