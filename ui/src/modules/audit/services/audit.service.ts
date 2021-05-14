/* eslint-disable @typescript-eslint/naming-convention */
import { DecimalPipe } from '@angular/common';
import { Injectable, PipeTransform } from '@angular/core';
import { AuditEvent, MetricTypeEnum } from '@common/models';
import { AppCommonService } from '@common/services';
import { SortDirection } from '@modules/players/directives';
import { BehaviorSubject, Observable, of, Subject, Subscription } from 'rxjs';
import { debounceTime, delay, switchMap, tap } from 'rxjs/operators';

interface SearchResult {
    audits: AuditEvent[];
    total: number;
}

interface State {
    page: number;
    pageSize: number;
    searchTerm: string;
    sortColumn: 'timestamp';
    sortDirection: SortDirection;
}

const compare = (v1: number | string, v2: number | string): -1 | 1 | 0 => {
    return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
};

const sort = (audits: AuditEvent[], column: 'timestamp', direction: string): AuditEvent[] => {
    if (direction === '') {
        return audits;
    }
    return [...audits].sort((a, b) => {
        const res = compare(a[column], b[column]);
        return direction === 'asc' ? res : -res;
    });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const matches = (audit: AuditEvent, term: string, pipe: PipeTransform): boolean => {
    return (
        audit.user?.toLowerCase()?.includes(term.toLowerCase())
        || audit.value?.resource?.toLowerCase()?.includes(term.toLowerCase())
    );
};

@Injectable({ providedIn: 'root' })
export class AuditService {

    protected _loading$ = new BehaviorSubject<boolean>(true);
    protected _search$ = new Subject<void>();
    protected _audits$ = new BehaviorSubject<AuditEvent[]>([]);
    protected _total$ = new BehaviorSubject<number>(0);

    protected _state: State = {
        page: 1,
        pageSize: 4,
        searchTerm: '',
        sortColumn: 'timestamp',
        sortDirection: '',
    };

    protected currentAudits: AuditEvent[] = [];
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
                this._audits$.next(result.audits);
                this._total$.next(result.total);
            });

        this._search$.next();
    }

    protected listenToPlayerChanges(): void {
        this.sub = this.appCommon.getApiFetcher<
        MetricTypeEnum.AUDIT,
        AuditEvent
        >(MetricTypeEnum.AUDIT).data.subscribe(
            (audits) => {
                if (audits?.length) {
                    this.currentAudits = audits;
                    this._search$.next();
                }
            },
        );
    }

    public get audits$(): Observable<AuditEvent[]> {
        return this._audits$.asObservable();
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
    public set sortColumn(sortColumn: 'timestamp') {
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
        let audits = sort(this.currentAudits, sortColumn, sortDirection);

        // 2. filter
        audits = audits.filter((country) => matches(country, searchTerm, this.pipe));
        const total = audits.length;

        // 3. paginate
        audits = audits.slice((page - 1) * pageSize, ((page - 1) * pageSize) + pageSize);
        return of({ audits, total });
    }

}
