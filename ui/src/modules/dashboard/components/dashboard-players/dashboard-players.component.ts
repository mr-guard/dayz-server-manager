import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
    selector: 'sb-dashboard-players',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard-players.component.html',
    styleUrls: ['dashboard-players.component.scss'],
})
export class DashboardPlayersComponent implements OnInit {

    public ngOnInit(): void {
        // ignore
    }

}
