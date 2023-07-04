import * as fs from 'fs';
import * as https from 'https';
import * as childProcess from 'child_process';
import * as chokidarModule from 'chokidar';
import { Socket } from '@senfo/battleye';

export type FSAPI = typeof fs;

export type HTTPSAPI = typeof https;

export type CHILDPROCESSAPI = typeof childProcess;

export type CHOKIDAR = typeof chokidarModule;

export type RCONSOCKETFACTORY = () => Socket;

export class InjectionTokens {

    public static fs = 'fs';

    public static https = 'https';

    public static childProcess = 'childProcess';

    public static chokidar = 'chokidar';

    public static rconSocket = 'rconSocket';

}
