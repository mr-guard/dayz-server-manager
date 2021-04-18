import { Manager } from '../control/manager';
import { Logger, LogLevel } from '../util/logger';
import { Processes } from '../util/processes';
import * as fs from 'fs';
import * as path from 'path';
import { NetSH } from '../util/netsh';

export class Requirements {

    private static log = new Logger('Requirements');

    private readonly VCREDIST_LINK = 'https://www.microsoft.com/en-us/download/details.aspx?id=52685';
    private readonly VCREDIST_MARKER_DLL = 'VCRuntime140.dll';
    private readonly DX11_LINK = 'https://www.microsoft.com/en-us/download/confirmation.aspx?id=35';
    private readonly DX11_MARKER_DLL = 'XAPOFX1_5.dll';
    private readonly POSSIBLE_PATHS = ['C:/Windows/System32', 'C:/Windows/SysWOW64'];

    private readonly REG_WIN_ERRORS =
    'Windows Registry Editor Version 5.00\n'
    + '\n'
    + '[HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Windows Error Reporting]\n'
    + '"DontShowUI"=dword:00000001';

    public constructor(
        private manager: Manager,
    ) {}

    public async checkFirewall(): Promise<boolean> {
        Requirements.log.log(LogLevel.DEBUG, 'Checking Firewall');
        const exePath = path.resolve(this.manager.getServerExePath());
        const firewallRules = await NetSH.getRulesByPath(exePath);
        if (firewallRules?.length) {
            Requirements.log.log(LogLevel.DEBUG, 'Firewall is OK!');
            return true;
        }


        Requirements.log.log(
            LogLevel.IMPORTANT,
            '\n\nFirewall rules were not found.\n'
                + 'You can add the rules manually or by running the following command in a elevated command promt:\n\n'
                + `netsh firewall add allowedprogram ${exePath} DayZ ENABLE\n\n`,
            // + `Add the firewall rule and restart the manager`,
        );
        return false;
    }

    public async checkDirectX(): Promise<boolean> {
        Requirements.log.log(LogLevel.DEBUG, 'Checking DirectX');
        const dx11Exists = this.POSSIBLE_PATHS.map((searchPath) => {
            return fs.existsSync(
                path.resolve(
                    path.join(
                        searchPath,
                        this.DX11_MARKER_DLL,
                    ),
                ),
            );
        }).some((x) => x);
        if (dx11Exists) {
            Requirements.log.log(LogLevel.DEBUG, 'DirectX is OK!');
            return true;
        }
        Requirements.log.log(
            LogLevel.IMPORTANT,
            '\n\nDirectX was not found.\n'
                + 'You can install it from:\n\n'
                + `${this.DX11_LINK}\n\n`
                + `Install it and restart the manager`,
        );
        return false;
    }

    public async checkVcRedist(): Promise<boolean> {
        const vcRedistExists = this.POSSIBLE_PATHS.map((searchPath) => {
            return fs.existsSync(
                path.resolve(
                    path.join(
                        searchPath,
                        this.VCREDIST_MARKER_DLL,
                    ),
                ),
            );
        }).some((x) => x);
        if (vcRedistExists) {
            Requirements.log.log(LogLevel.DEBUG, 'Visual C++ Redistributable is OK!');
            return true;
        }
        Requirements.log.log(
            LogLevel.IMPORTANT,
            '\n\nVisual C++ Redistributable was not found.\n'
                + 'You can install it from:\n\n'
                + `${this.VCREDIST_LINK}\n\n`
                + `Install it and restart the manager`,
        );
        return false;
    }

    public async checkWinErrorReporting(): Promise<boolean> {
        const winErrorReportingOut = await Processes.spawnForOutput(
            'REG',
            [
                'QUERY',
                'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Windows Error Reporting',
                '/v',
                'DontShowUI',
            ],
            {
                dontThrow: true,
            },
        );
        if (
            winErrorReportingOut?.status !== 0
                || !winErrorReportingOut.stdout
                || !winErrorReportingOut.stdout?.includes('0x1')
        ) {
            Requirements.log.log(
                LogLevel.IMPORTANT,
                '\n\nWindows Error Reporting Settings are not setup to avoid the server from getting stuck.\n'
                    + 'You change this by executing the fix_win_err_report.reg located in the server manager config directory.\n\n',
            );
            fs.writeFileSync(
                'fix_win_err_report.reg',
                this.REG_WIN_ERRORS,
            );
            return false;
        }

        Requirements.log.log(LogLevel.DEBUG, 'Windows Error Reporting Settings are OK!');
        return true;
    }

}
