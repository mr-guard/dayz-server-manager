import * as fs from 'fs';
import * as https from 'https';
import * as childProcess from 'child_process';
import * as chokidarModule from 'chokidar';
import * as nodePty from 'node-pty';
import * as dgram from 'dgram';

export type FSAPI = typeof fs;

export type HTTPSAPI = typeof https;

export type CHILDPROCESSAPI = typeof childProcess;

export type PTYAPI = typeof nodePty;

export type CHOKIDAR = typeof chokidarModule;

export type RCONSOCKETFACTORY = () => dgram.Socket;

export class InjectionTokens {

    public static fs = 'fs';

    public static https = 'https';

    public static childProcess = 'childProcess';

    public static pty = 'pty';

    public static chokidar = 'chokidar';

    public static rconSocket = 'rconSocket';

}
