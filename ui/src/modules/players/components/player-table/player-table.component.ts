import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { RconPlayer } from '@common/models';
import { SBSortableHeaderDirective, SortEvent } from '@modules/players/directives';
import { AllPlayersService, PlayersService } from '@modules/players/services';
import { Observable } from 'rxjs';

@Component({
    selector: 'sb-player-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './player-table.component.html',
    styleUrls: ['player-table.component.scss'],
})
export class PlayerTableComponent implements OnInit {

    public readonly MAX_ITEMS = 9999999;

    @Input() public pageSize = this.MAX_ITEMS;

    public players$!: Observable<RconPlayer[]>;
    public total$!: Observable<number>;
    public sortedColumn!: string;
    public sortedDirection!: string;

    @ViewChildren(SBSortableHeaderDirective) public headers!: QueryList<SBSortableHeaderDirective>;

    public constructor(
        public playerService: PlayersService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        this.playerService.pageSize = this.pageSize;
        this.players$ = this.playerService.players$;
        this.total$ = this.playerService.total$;
    }

    public onSort({ column, direction }: SortEvent): void {
        if (column === 'id' || column === 'name' || column === 'ping') {
            this.sortedColumn = column;
            this.sortedDirection = direction;
            this.playerService.sortColumn = column;
            this.playerService.sortDirection = direction;
            this.changeDetectorRef.detectChanges();
        }
    }

}

@Component({
    selector: 'sb-all-player-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './player-table.component.html',
    styleUrls: ['player-table.component.scss'],
})
export class AllPlayerTableComponent implements OnInit {

    public readonly MAX_ITEMS = 9999999;

    @Input() public pageSize = this.MAX_ITEMS;

    public players$!: Observable<RconPlayer[]>;
    public total$!: Observable<number>;
    public sortedColumn!: string;
    public sortedDirection!: string;

    @ViewChildren(SBSortableHeaderDirective) public headers!: QueryList<SBSortableHeaderDirective>;

    public constructor(
        public playerService: AllPlayersService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        this.playerService.pageSize = this.pageSize;
        this.players$ = this.playerService.players$;
        this.total$ = this.playerService.total$;
    }

    public onSort({ column, direction }: SortEvent): void {
        if (column === 'id' || column === 'name' || column === 'ping') {
            this.sortedColumn = column;
            this.sortedDirection = direction;
            this.playerService.sortColumn = column;
            this.playerService.sortDirection = direction;
            this.changeDetectorRef.detectChanges();
        }
    }

}
