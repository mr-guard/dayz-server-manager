import {
    Component,
    Input,
    OnInit,
} from '@angular/core';
import { SortEvent } from '../../directives/sortable.directive';
import { MergedPlayer, PlayersService } from '../..//services/players.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'sb-player-table',
    templateUrl: './player-table.component.html',
    styleUrls: ['player-table.component.scss'],
})
export class PlayerTableComponent implements OnInit {

    public readonly MAX_ITEMS = 9999999;

    @Input() public players$!: Observable<MergedPlayer[]>;
    @Input() public total$!: Observable<number>;

    public constructor(
        public playerService: PlayersService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

    public onSort({ column, direction }: SortEvent): void {
        this.playerService.updateState({
            sortColumn: column as keyof MergedPlayer,
            sortDirection: direction,
        });
    }

}
