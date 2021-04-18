import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
    selector: 'sb-maintenance',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './maintenance.component.html',
    styleUrls: ['maintenance.component.scss'],
})
export class MaintenanceComponent implements OnInit {

    public ngOnInit(): void {
        // ignore
    }

    public updateServer(): void {
        // TODO
    }

    public updateMods(): void {
        // TODO
    }

    public createBackup(): void {
        // TODO
    }

    public lockServer(): void {
        // TODO
    }

    public unlockServer(): void {
        // TODO
    }

    public lockRestarts(): void {
        // TODO
    }

    public unlockRestarts(): void {
        // TODO
    }

}
