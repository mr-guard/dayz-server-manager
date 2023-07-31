import { Component, OnInit } from '@angular/core';
import { MaintenanceService } from '../../services/maintenance.service';

@Component({
    selector: 'sb-maintenance',
    templateUrl: './maintenance.component.html',
    styleUrls: ['maintenance.component.scss'],
})
export class MaintenanceComponent implements OnInit {

    public outcomeBadge?: {
        message: string;
        success: boolean;
    };

    public constructor(
        private maintenance: MaintenanceService,
    ) {}

    public ngOnInit(): void {
        // ignore
    }

    public async updateServer(): Promise<void> {
        const success = await this.maintenance.updateServer();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully updated server',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to update server',
                success: false,
            };
        }
    }

    public async updateMods(): Promise<void> {
        const success = await this.maintenance.updateMods();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully updated mods',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to update mods',
                success: false,
            };
        }
    }

    public async createBackup(): Promise<void> {
        const success = await this.maintenance.createBackup();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully created backup',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to create backup',
                success: false,
            };
        }
    }

    public async lockServer(): Promise<void> {
        const success = await this.maintenance.lockServer();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully locked the server',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to lock the server',
                success: false,
            };
        }
    }

    public async unlockServer(): Promise<void> {
        const success = await this.maintenance.unlockServer();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully unlocked the server',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to unlock the server',
                success: false,
            };
        }
    }

    public async lockRestarts(): Promise<void> {
        const success = await this.maintenance.lockRestarts();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully locked server restarts',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to lock server restarts',
                success: false,
            };
        }
    }

    public async unlockRestarts(): Promise<void> {
        const success = await this.maintenance.unlockRestarts();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully unlocked server restarts',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to unlock server restarts',
                success: false,
            };
        }
    }

    public async restartServer(force?: boolean): Promise<void> {
        const success = await this.maintenance.restartServer(force);
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully killed the server',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to kill the server',
                success: false,
            };
        }
    }

}
