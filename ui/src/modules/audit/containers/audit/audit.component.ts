import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
    selector: 'sb-audit',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './audit.component.html',
    styleUrls: ['audit.component.scss'],
})
export class AuditComponent implements OnInit {

    public ngOnInit(): void {
        // ignore
    }

}
