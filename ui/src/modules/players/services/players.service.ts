/* eslint-disable @typescript-eslint/naming-convention */
import { DecimalPipe } from '@angular/common';
import { Injectable, PipeTransform } from '@angular/core';
import { MetricTypeEnum, MetricWrapper, RconPlayer } from '../../app-common/models';
import { BehaviorSubject, Observable, of, Subject, Subscription } from 'rxjs';
import { debounceTime, delay, switchMap, tap } from 'rxjs/operators';
import { SortDirection } from '../directives/sortable.directive';
import { AppCommonService } from 'src/modules/app-common/services/app-common.service';

interface SearchResult {
    players: RconPlayer[];
    total: number;
}

interface State {
    page: number;
    pageSize: number;
    searchTerm: string;
    sortColumn: 'name' | 'id' | 'ping';
    sortDirection: SortDirection;
}

const compare = (v1: number | string, v2: number | string): -1 | 1 | 0 => {
    return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
};

const sort = (players: RconPlayer[], column: 'name' | 'id' | 'ping', direction: string): RconPlayer[] => {
    if (direction === '') {
        return players;
    }
    return [...players].sort((a, b) => {
        const res = compare(a[column], b[column]);
        return direction === 'asc' ? res : -res;
    });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const matches = (player: RconPlayer, term: string, pipe: PipeTransform): boolean => {
    return (
        player.name.toLowerCase().includes(term.toLowerCase())
        || player.beguid.includes(term)
        || player.ip.includes(term)
    );
};

@Injectable({ providedIn: 'root' })
export class PlayersService {

    protected _loading$ = new BehaviorSubject<boolean>(true);
    protected _search$ = new Subject<void>();
    protected _players$ = new BehaviorSubject<RconPlayer[]>([]);
    protected _total$ = new BehaviorSubject<number>(0);

    protected _state: State = {
        page: 1,
        pageSize: 4,
        searchTerm: '',
        sortColumn: 'id',
        sortDirection: '',
    };

    protected currentPlayers: RconPlayer[] = [];
    protected sub!: Subscription;

    public constructor(
        protected pipe: DecimalPipe,
        protected appCommon: AppCommonService,
    ) {

        this.listenToPlayerChanges();

        this._search$
            .pipe(
                tap(() => this._loading$.next(true)),
                debounceTime(120),
                switchMap(() => this._search()),
                delay(120),
                tap(() => this._loading$.next(false)),
            )
            .subscribe((result) => {
                this._players$.next(result.players);
                this._total$.next(result.total);
            });

        this._search$.next();
    }

    protected listenToPlayerChanges(): void {
        this.sub = this.appCommon.getApiFetcher<
        MetricTypeEnum.PLAYERS,
        MetricWrapper<RconPlayer[]>
        >(MetricTypeEnum.PLAYERS)!.latestData.subscribe(
            (players) => {
                if (players?.value) {
                    this.currentPlayers = players.value;
                    this._search$.next();
                }
            },
        );
    }

    public get players$(): Observable<RconPlayer[]> {
        return this._players$.asObservable();
    }

    public get total$(): Observable<number> {
        return this._total$.asObservable();
    }

    public get loading$(): Observable<boolean> {
        return this._loading$.asObservable();
    }

    public get page(): number {
        return this._state.page;
    }

    public set page(page: number) {
        this._set({ page });
    }

    public get pageSize(): number {
        return this._state.pageSize;
    }

    public set pageSize(pageSize: number) {
        this._set({ pageSize });
    }

    public get searchTerm(): string {
        return this._state.searchTerm;
    }

    public set searchTerm(searchTerm: string) {
        this._set({ searchTerm });
    }

    // eslint-disable-next-line accessor-pairs
    public set sortColumn(sortColumn: 'name' | 'id' | 'ping') {
        this._set({ sortColumn });
    }

    // eslint-disable-next-line accessor-pairs
    public set sortDirection(sortDirection: SortDirection) {
        this._set({ sortDirection });
    }

    protected _set(patch: Partial<State>): void {
        Object.assign(this._state, patch);
        this._search$.next();
    }

    protected _search(): Observable<SearchResult> {
        const { sortColumn, sortDirection, pageSize, page, searchTerm } = this._state;

        // 1. sort
        let players = sort(this.currentPlayers, sortColumn, sortDirection);

        // 2. filter
        players = players.filter((country) => matches(country, searchTerm, this.pipe));
        const total = players.length;

        // 3. paginate
        players = players.slice((page - 1) * pageSize, ((page - 1) * pageSize) + pageSize);
        return of({ players, total });
    }

}

@Injectable({ providedIn: 'root' })
export class AllPlayersService extends PlayersService {

    public constructor(
        pipe: DecimalPipe,
        appCommon: AppCommonService,
    ) {
        super(pipe, appCommon);
    }

    protected override listenToPlayerChanges(): void {
        this.sub = this.appCommon.getApiFetcher<
        MetricTypeEnum.PLAYERS,
        MetricWrapper<RconPlayer[]>
        >(MetricTypeEnum.PLAYERS).data.subscribe(
            (metrics) => {
                if (metrics?.length) {
                    const guids = new Set<string>();
                    const players: RconPlayer[] = [];
                    for (const metric of metrics) {
                        if (metric?.value?.length) {
                            for (const player of metric.value) {
                                if (player.beguid && !guids.has(player.beguid)) {
                                    guids.add(player.beguid);

                                    players.push(player);
                                }
                            }
                        }
                    }

                    this.currentPlayers = players;
                    this._search$.next();
                }
            },
        );
    }

}
