import {
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { RconPlayer } from '../../../app-common/models';
import { SBSortableHeaderDirective, SortEvent } from '../../directives/sortable.directive';
import { AllPlayersService, PlayersService } from '../..//services/players.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'sb-player-table',
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
