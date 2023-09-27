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

    private exactBooleanParse(val?: string): boolean | undefined {
        val = val + '';
        if (val === 'true') {
            return true;
        } else if (val === 'false') {
            return false;
        } else {
            return undefined;
        }
    }

    public async updateServer(validate?: string): Promise<void> {
        const success = await this.maintenance.updateServer(this.exactBooleanParse(validate));
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

    public async updateMods(validate?: string, force?: string): Promise<void> {
        const success = await this.maintenance.updateMods(this.exactBooleanParse(validate), this.exactBooleanParse(force));
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

    public async kickAll(): Promise<void> {
        const success = await this.maintenance.kickAll();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully kicked all players',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to kick all players',
                success: false,
            };
        }
    }

    public async shutdown(): Promise<void> {
        const success = await this.maintenance.shutdown();
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully executed RCON shutdown',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to execute RCON shutdown',
                success: false,
            };
        }
    }

    public async sendMessage(msg: string): Promise<void> {
        if (!msg?.trim()) {
            return;
        }
        const success = await this.maintenance.sendMessage(msg.trim());
        if (success) {
            this.outcomeBadge = {
                message: 'Successfully sent global message',
                success: true,
            };
        } else {
            this.outcomeBadge = {
                message: 'Failed to send global message',
                success: false,
            };
        }
    }

}
