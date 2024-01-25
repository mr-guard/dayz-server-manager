import { Injectable } from '@angular/core';
import { MetricTypeEnum, MetricWrapper, RconPlayer, IngameReportEntry, RconBan } from '../../app-common/models';
import { BehaviorSubject, combineLatest, merge, Observable, of, Subject, Subscription } from 'rxjs';
import { debounceTime, delay, filter, first, map, switchMap, tap } from 'rxjs/operators';
import { SortDirection } from '../directives/sortable.directive';
import { AppCommonService } from 'src/modules/app-common/services/app-common.service';
import sha256 from 'crypto-js/sha256';
import md5 from 'crypto-js/md5';
import WordArray from 'crypto-js/lib-typedarrays';
import Base64 from 'crypto-js/enc-base64';
import bigInt from 'big-integer';

export interface MergedPlayer {
    beguid: string;
    id?: string;
    name?: string;
    ip?: string;
    port?: string;
    ping?: string;
    lobby?: boolean;

    steamid?: string;
    dayzid?: string;
    ingamename?: string;
    position?: string;
    speed?: string;
    damage?: number;

    banned?: boolean;
    whitelisted?: boolean;
    prio?: boolean;
}

interface SearchResult {
    players: MergedPlayer[];
    total: number;
    allPlayers: MergedPlayer[];
    allTotal: number;
}

interface State {
    page: number;
    pageSize: number;
    searchTerm: string;
    sortColumn: keyof MergedPlayer;
    sortDirection: SortDirection;
}

const compare = (v1: number | string, v2: number | string): -1 | 1 | 0 => {
    return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
};

const sort = (players: MergedPlayer[], column: keyof MergedPlayer, direction: string): MergedPlayer[] => {
    if (direction === '') {
        return players;
    }
    return [...players].sort((a, b) => {
        const res = compare(a[column as string], b[column as string]);
        return direction === 'asc' ? res : -res;
    });
};

const matches = (player: MergedPlayer, term: string): boolean => {
    return (
        !!player.name?.toLowerCase().includes(term.toLowerCase())
        || !!player.ip?.includes(term)
        || player.beguid.includes(term)
        || !!player.steamid?.includes(term)
        || !!player.dayzid?.includes(term)
    );
};

@Injectable({ providedIn: 'root' })
export class PlayersService {

    protected knownPlayers = new Map<string, MergedPlayer>();
    protected currentPlayers: MergedPlayer[] = [];

    protected _loading$ = new BehaviorSubject<boolean>(true);
    protected _search$ = new Subject<void>();
    protected _players$ = new BehaviorSubject<MergedPlayer[]>([]);
    protected _total$ = new BehaviorSubject<number>(0);
    protected _allPlayers$ = new BehaviorSubject<MergedPlayer[]>([]);
    protected _allTotal$ = new BehaviorSubject<number>(0);

    protected _selected$ = new BehaviorSubject<MergedPlayer | undefined>(undefined);

    protected _state$ = new BehaviorSubject<State>({
        page: 1,
        pageSize: 4,
        searchTerm: '',
        sortColumn: 'id',
        sortDirection: '',
    });

    public bans = new Set<string>();
    public whitelisted = new Set<string>();
    public priority = new Set<string>();
    public rconBans = new Map<string, RconBan>();

    public async loadLists(): Promise<void> {
        this.bans = await this.readBanTxt().toPromise().catch(() => []).then((x) => new Set(x));
        this.whitelisted = await this.readWhitelistTxt().toPromise().catch(() => []).then((x) => new Set(x));
        this.priority = await this.readPriorityTxt().toPromise().catch(() => []).then((x) => new Set(x));
        this.rconBans = await this.readRconBans().toPromise().catch(() => [] as RconBan[]).then((x) => new Map(x.map((y) => [y.id, y])));

        this.knownPlayers.forEach((x) => {
            this.updatePlayerWithIngame({ id2: x.steamid } as any);
        });

        this._search$.next();
    }

    public constructor(
        protected appCommon: AppCommonService,
    ) {
        void this.loadLists();
        void this.listenToPlayerChanges();

        this.state$
            .pipe(
                debounceTime(120)
            )
            .subscribe(() => this._search$.next());

        this._search$
            .pipe(
                tap(() => this._loading$.next(true)),
                debounceTime(120),
                switchMap(() => this._search()),
                tap(() => this._loading$.next(false)),
            )
            .subscribe((result) => {
                this._players$.next(result.players);
                this._total$.next(result.total);
                this._allPlayers$.next(result.allPlayers);
                this._allTotal$.next(result.allTotal);
            });

        this._search$.next();

    }

    protected async listenToPlayerChanges(): Promise<void> {
        const [rconPlayers, ingamePlayers] = await Promise.all([
            this.appCommon.getApiFetcher<
                MetricTypeEnum.PLAYERS,
                MetricWrapper<RconPlayer[]>
            >(MetricTypeEnum.PLAYERS).data
                .pipe(
                    filter((x) => !!x?.length),
                    first(),
                )
                .toPromise(),
            this.appCommon.getApiFetcher<
                MetricTypeEnum.INGAME_PLAYERS,
                MetricWrapper<IngameReportEntry[]>
            >(MetricTypeEnum.INGAME_PLAYERS)!.data
                .pipe(
                    filter((x) => !!x?.length),
                    first(),
                )
                .toPromise(),
        ]);

        const uniqueRconPlayers = new Map<string, RconPlayer>();
        rconPlayers?.forEach((x) => x.value?.forEach((y) => uniqueRconPlayers.set(y.beguid, y)));
        uniqueRconPlayers.forEach((x) => this.updatePlayerWithRcon(x));

        const uniqueIngamePlayers = new Map<string, IngameReportEntry>();
        ingamePlayers?.forEach((x) => x.value?.forEach((y) => {
            if (y.id2) uniqueIngamePlayers.set(y.id2!, y);
        }));
        uniqueIngamePlayers.forEach((x) => this.updatePlayerWithIngame(x));

        this._search$.next();

        this.appCommon.getApiFetcher<
            MetricTypeEnum.PLAYERS,
            MetricWrapper<RconPlayer[]>
        >(MetricTypeEnum.PLAYERS)!.latestData.subscribe(
            (data) => {
                if (data?.value) {
                    data.value.forEach((x) => this.updatePlayerWithRcon(x));
                    this.currentPlayers = data.value.map((x) => this.knownPlayers.get(x.beguid)!);
                    this._search$.next();
                }
            }
        );
        this.appCommon.getApiFetcher<
            MetricTypeEnum.INGAME_PLAYERS,
            MetricWrapper<IngameReportEntry[]>
        >(MetricTypeEnum.INGAME_PLAYERS)!.latestData.subscribe(
            (data) => {
                if (data?.value) {
                    data.value.forEach((x) => this.updatePlayerWithIngame(x));
                    this.currentPlayers = data.value
                        .map((x) => this.knownPlayers.get(
                            this.steam64ToBEGUID(x.id2!)
                        )!)
                        .filter((x) => !!x);
                    this._search$.next();
                }
            }
        );
    }

    public get players$(): Observable<MergedPlayer[]> {
        return this._players$.asObservable();
    }

    public get total$(): Observable<number> {
        return this._total$.asObservable();
    }

    public get allPlayers$(): Observable<MergedPlayer[]> {
        return this._allPlayers$.asObservable();
    }

    public get allTotal$(): Observable<number> {
        return this._allTotal$.asObservable();
    }

    public get loading$(): Observable<boolean> {
        return this._loading$.asObservable();
    }

    public get state$(): Observable<State> {
        return this._state$;
    }

    public updateState(patch: Partial<State>): void {
        this._state$.next(Object.assign({}, this._state$.value, patch));
    }

    public get selected$(): Observable<MergedPlayer | undefined> {
        return this._selected$.asObservable();
    }

    public selectPlayer(id: string): void {
        let player: MergedPlayer | undefined = undefined;
        if (id?.length === 17) {
            const beguid = this.steam64ToBEGUID(id);
            player = this.knownPlayers.get(beguid) || {
                beguid,
                steamid: id,
                dayzid: this.steam64ToDayZID(id),
            };
        } else if (id?.length === 44) {
            player = [...this.knownPlayers].find((x) => x[1].dayzid === id)?.[1];
        } else {
            player = this.knownPlayers.get(id);
        }

        this._selected$.next(player);
        this._search$.next();
    }

    private updatePlayerWithRcon(rconPlayer: RconPlayer): MergedPlayer {
        const prevPlayer: MergedPlayer = this.knownPlayers.get(rconPlayer.beguid) || {} as any;
        this.knownPlayers.set(
            rconPlayer.beguid,
            Object.assign(
                {},
                prevPlayer,
                prevPlayer?.steamid ? {
                    ...rconPlayer,
                    banned: this.isBanned(prevPlayer.dayzid || prevPlayer.steamid),
                    whitelisted: this.isWhitelisted(prevPlayer.dayzid || prevPlayer.steamid),
                    prio: this.isPrio(prevPlayer.steamid),
                } : rconPlayer,
            ),
        );
        return this.knownPlayers.get(rconPlayer.beguid)!;
    }

    private updatePlayerWithIngame(ingamePlayer: IngameReportEntry): MergedPlayer {
        const beguid = this.steam64ToBEGUID(ingamePlayer?.id2!);
        if (!beguid) return null!;
        const dayzid = this.steam64ToDayZID(ingamePlayer?.id2!);
        const prevPlayer: MergedPlayer = this.knownPlayers.get(beguid) || { beguid };
        this.knownPlayers.set(
            beguid,
            Object.assign(
                {},
                prevPlayer,
                {
                    beguid,
                    damage: ingamePlayer?.damage ?? prevPlayer.damage,
                    ingamename: ingamePlayer?.name ?? prevPlayer.ingamename,
                    position: ingamePlayer?.position ?? prevPlayer.position,
                    speed: ingamePlayer?.speed?? prevPlayer.speed,
                    steamid: ingamePlayer?.id2 ?? prevPlayer.steamid,
                    dayzid,
                    banned: this.isBanned(dayzid || ingamePlayer.id2),
                    whitelisted: this.isWhitelisted(dayzid || ingamePlayer.id2),
                    prio: this.isPrio(ingamePlayer.id2),
                },
            ),
        );
        return this.knownPlayers.get(beguid)!;
    }

    protected _search(): Observable<SearchResult> {
        const { sortColumn, sortDirection, pageSize, page, searchTerm } = this._state$.value;

        const players = sort(this.currentPlayers, sortColumn, sortDirection)
            .filter((x) => matches(x, searchTerm))
            .slice((page - 1) * pageSize, ((page - 1) * pageSize) + pageSize)
        ;
        const allPlayers = sort([...this.knownPlayers.values()], sortColumn, sortDirection)
            .filter((x) => matches(x, searchTerm))
            .slice((page - 1) * pageSize, ((page - 1) * pageSize) + pageSize)
        ;

        return of({ players, total: players.length, allPlayers, allTotal: allPlayers.length });
    }

    public isBanned(steamId?: string): boolean {
        if (!steamId) return false;
        const dayzId = steamId.length === 17 ? this.steam64ToDayZID(steamId) : steamId;
        const beId = steamId.length === 17 ? this.steam64ToBEGUID(steamId) : steamId;
        return this.bans?.has(dayzId) ||this.rconBans?.has(beId);
    }

    public isWhitelisted(steamId?: string): boolean {
        if (!steamId) return false;
        const dayzId = steamId.length === 17 ? this.steam64ToDayZID(steamId) : steamId;
        return this.whitelisted?.has(dayzId);
    }

    public isPrio(steamId?: string): boolean {
        if (steamId?.length !== 17) return false;
        return this.priority?.has(steamId);
    }

    public steam64ToDayZID(steam64Id: string): string {
        if (!steam64Id || steam64Id.length !== 17) return '';
        return sha256(steam64Id)
            .toString(Base64)
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    public steam64ToBEGUID(steam64Id: string): string {
        if (!steam64Id || steam64Id.length !== 17) return '';

        try {
            let steamId = bigInt(steam64Id);
            const parts = [0x42,0x45,0,0,0,0,0,0,0,0];

            for (let i = 2; i < 10; i++) {
                const res = steamId.divmod(256);
                steamId = res.quotient;
                parts[i] = res.remainder.toJSNumber();
            }

            const wordArray = WordArray.create(new Uint8Array(parts) as any);
            const hash = md5(wordArray);
            return hash.toString();
        } catch {
            return '';
        }
    }

    public ban(steam64Id: string): Observable<any> {
        return this.appCommon.apiPOST(
            `bantxt`,
            {
                steamid: steam64Id
            }
        );
    }

    public unban(steam64Id: string): Observable<any> {
        return this.appCommon.apiPOST(
            `unbantxt`,
            {
                steamid: steam64Id
            }
        );
    }

    public whitelist(steam64Id: string): Observable<any> {
        return this.appCommon.apiPOST(
            `whitelisttxt`,
            {
                steamid: steam64Id
            }
        );
    }

    public unwhitelist(steam64Id: string): Observable<any> {
        return this.appCommon.apiPOST(
            `unwhitelisttxt`,
            {
                steamid: steam64Id
            }
        );
    }

    public prio(steam64Id: string): Observable<any> {
        return this.appCommon.apiPOST(
            `prioritytxt`,
            {
                steamid: steam64Id
            }
        );
    }

    public unprio(steam64Id: string): Observable<any> {
        return this.appCommon.apiPOST(
            `unprioritytxt`,
            {
                steamid: steam64Id
            }
        );
    }

    public readPriorityTxt(): Observable<string[]> {
        return this.appCommon.apiGET(
            `readprioritytxt`,
        ).pipe(
            map((x) => !!x ? JSON.parse(x) : [])
        );
    }

    public readBanTxt(): Observable<string[]> {
        return this.appCommon.apiGET(
            `readbantxt`,
        ).pipe(
            map((x) => !!x ? JSON.parse(x) : [])
        );
    }

    public readWhitelistTxt(): Observable<string[]> {
        return this.appCommon.apiGET(
            `readwhitelisttxt`,
        ).pipe(
            map((x) => !!x ? JSON.parse(x) : [])
        );
    }

    public readRconBans(): Observable<RconBan[]> {
        return this.appCommon.apiGET(
            `bans`,
        ).pipe(
            tap(x => console.warn(x)),
            map((x) => !!x ? JSON.parse(x) : [])
        );
    }

    public reloadRconBans(): Observable<any> {
        return this.appCommon.apiPOST(
            `reloadbans`,
            {},
        ).pipe(
            tap(x => console.warn(x)),
        );
    }

}
