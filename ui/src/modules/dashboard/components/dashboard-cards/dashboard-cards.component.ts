import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ServerState } from '@common/models';
import { AppCommonService } from '@common/services';

@Component({
    selector: 'sb-dashboard-cards',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard-cards.component.html',
    styleUrls: ['dashboard-cards.component.scss'],
})
export class DashboardCardsComponent implements OnInit {

    public constructor(
        public commonService: AppCommonService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

    public serverStateToStyle(s: ServerState): string {
        /* eslint-disable indent */
        switch (s) {
            case ServerState.STARTED: {
                return 'bg-success';
            }
            case ServerState.STARTING: {
                return 'bg-warn';
            }
            default: {
                return 'bg-danger';
            }
        }
        /* eslint-enable indent */
    }

}
