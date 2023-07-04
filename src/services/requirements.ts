import { LogLevel } from '../util/logger';
import { Processes } from '../services/processes';
import * as path from 'path';
import { NetSH } from '../services/netsh';
import { detectOS } from '../util/detect-os';
import { IService } from '../types/service';
import { LoggerFactory } from './loggerfactory';
import { Manager } from '../control/manager';
import { FSAPI, InjectionTokens } from '../util/apis';
import { inject, injectable, singleton } from 'tsyringe';

@singleton()
@injectable()
export class Requirements extends IService {

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
        loggerFactory: LoggerFactory,
        private manager: Manager,
        private netSh: NetSH,
        private processes: Processes,
        @inject(InjectionTokens.fs) private fs: FSAPI,
    ) {
        super(loggerFactory.createLogger('Requirements'));
    }

    public async checkFirewall(): Promise<boolean> {
        this.log.log(LogLevel.DEBUG, 'Checking Firewall');

        if (detectOS() === 'windows') {
            const exePath = path.resolve(this.manager.getServerExePath());
            const firewallRules = await this.netSh.getRulesByPath(exePath);
            if (firewallRules?.length) {
                this.log.log(LogLevel.DEBUG, 'Firewall is OK!');
                return true;
            }

            this.log.log(
                LogLevel.IMPORTANT,
                '\n\nFirewall rules were not found.\n'
                    + 'You can add the rules manually or by running the following command in a elevated command promt:\n\n'
                    + `netsh firewall add allowedprogram ${exePath} DayZ ENABLE\n\n`,
                // + `Add the firewall rule and restart the manager`,
            );
            return false;
        }

        if (detectOS() === 'linux') {
            // TODO linux
            return true;
        }

        return false;
    }

    public async checkDirectX(): Promise<boolean> {
        this.log.log(LogLevel.DEBUG, 'Checking DirectX');
        const dx11Exists = this.POSSIBLE_PATHS.map((searchPath) => {
            return this.fs.existsSync(
                path.resolve(
                    path.join(
                        searchPath,
                        this.DX11_MARKER_DLL,
                    ),
                ),
            );
        }).some((x) => x);
        if (dx11Exists) {
            this.log.log(LogLevel.DEBUG, 'DirectX is OK!');
            return true;
        }
        this.log.log(
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
            return this.fs.existsSync(
                path.resolve(
                    path.join(
                        searchPath,
                        this.VCREDIST_MARKER_DLL,
                    ),
                ),
            );
        }).some((x) => x);
        if (vcRedistExists) {
            this.log.log(LogLevel.DEBUG, 'Visual C++ Redistributable is OK!');
            return true;
        }
        this.log.log(
            LogLevel.IMPORTANT,
            '\n\nVisual C++ Redistributable was not found.\n'
                + 'You can install it from:\n\n'
                + `${this.VCREDIST_LINK}\n\n`
                + `Install it and restart the manager`,
        );
        return false;
    }

    public async isLinuxLibPresent(libname: string): Promise<boolean> {
        const result = await this.processes.spawnForOutput(
            'bash',
            [
                '-c',
                `ldconfig -p | grep ${libname}`,
            ],
            {
                dontThrow: true,
            },
        );
        const present = !!(result.stdout?.trim()?.length);

        if (present) {
            this.log.log(LogLevel.DEBUG, `${libname} is OK!`);
        }
        this.log.log(
            LogLevel.IMPORTANT,
            `\n\n${libname} was not found.\n`
                + 'You can install it by:\n\n'
                + `apt-get install ${libname}\n\n`
                + `Install it and restart the manager`,
        );

        return present;
    }

    public async checkRuntimeLibs(): Promise<boolean> {

        const checks: boolean[] = [];

        if (detectOS() === 'windows') {
            checks.push(
                await this.checkVcRedist(),
            );
            checks.push(
                await this.checkDirectX(),
            );
        }

        if (detectOS() === 'linux') {
            // server
            checks.push(
                await this.isLinuxLibPresent('libcap-dev'),
            );

            // steamcmd
            checks.push(
                await this.isLinuxLibPresent('lib32gcc1'),
            );
            checks.push(
                await this.isLinuxLibPresent('libcurl4'),
            );
            checks.push(
                await this.isLinuxLibPresent('libcurl4-openssl-dev'),
            );
        }

        return checks.every((x) => x);
    }

    public async checkWinErrorReporting(): Promise<boolean> {
        const winErrorReportingOut = await this.processes.spawnForOutput(
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
            this.log.log(
                LogLevel.IMPORTANT,
                '\n\nWindows Error Reporting Settings are not setup to avoid the server from getting stuck.\n'
                    + 'You change this by executing the fix_win_err_report.reg located in the server manager config directory.\n\n',
            );
            this.fs.writeFileSync(
                'fix_win_err_report.reg',
                this.REG_WIN_ERRORS,
            );
            return false;
        }

        this.log.log(LogLevel.DEBUG, 'Windows Error Reporting Settings are OK!');
        return true;
    }

    public async checkOptionals(): Promise<boolean> {

        if (detectOS() === 'windows') {
            return this.checkWinErrorReporting();
        }

        // TODO linux: anything for linux?
        return true;
    }

    public async check(): Promise<void> {
        // check firewall, but let the server boot if its not there (could be manually set to ports)
        await this.checkFirewall();

        // check optionals
        await this.checkOptionals();

        // check runtime libs
        if (!await this.checkRuntimeLibs()) {
            this.log.log(LogLevel.IMPORTANT, 'Install the missing runtime libs and restart the manager');
            this.processes.exit(0);
        }
    }

}
