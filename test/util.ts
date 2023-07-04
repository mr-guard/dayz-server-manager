import { Logger } from '../src/util/logger';
import * as sinon from 'sinon';
import * as memfsModule from 'memfs';
import { NestedDirectoryJSON } from 'memfs/lib/volume';
import { DependencyContainer } from 'tsyringe';
import { CHILDPROCESSAPI, FSAPI, HTTPSAPI, InjectionTokens } from '../src/util/apis';

const defaults = Logger.LogLevelFncs.slice(0);

export const disableConsole = () => {
    // disable console logs
    Logger.LogLevelFncs = Logger.LogLevelFncs.map((_x) => (_msg: string, _detail: any) => {});
};

export const enableConsole = () => {
    // disable console logs
    Logger.LogLevelFncs = defaults.slice(0);
};

export const stub = <T extends object>(object: T): sinon.SinonStubbedInstance<T> & T => {
    const stubObject = Object.assign(<sinon.SinonStubbedInstance<T>> {}, object);
    
    let prototype = Reflect.getPrototypeOf(object);
    while (prototype) {
        for (const key of Reflect.ownKeys(prototype)) {
            if (
                typeof key === 'string'
                && typeof object[key] === 'function'
                && !key.startsWith('__') // exclude meta funtions
                && ![
                    'constructor',
                    'hasOwnProperty',
                    'propertyIsEnumerable',
                    'isPrototypeOf'
                ].includes(key) // exclude meta functions 
            ) {
                stubObject[key] = sinon.stub();
            }
        }
        prototype = Reflect.getPrototypeOf(prototype);
    }


    return stubObject;
};

export interface IConstructor<T> {
    new(...args: any[]): T; // NOSONAR
}

export type StubInstance<T> = T & sinon.SinonStubbedInstance<T>;

export const stubClass = <T>(clazz: IConstructor<T>): IConstructor<T> => {
    const stubClass = class { // NOSONAR
        constructor() {} // NOSONAR
    } as any;
    
    do {
        for (const key of Object.getOwnPropertyNames(clazz.prototype)) {
            if (
                typeof key !== 'string'
                || !clazz.prototype
                || Object.getOwnPropertyDescriptor(clazz.prototype, key)?.get
                || Object.getOwnPropertyDescriptor(clazz.prototype, key)?.set
            ) {
                continue;
            }
            if (
                typeof (clazz.prototype[key]) === 'function'
                && !key.startsWith('__') // exclude meta funtions
                && ![
                    'constructor',
                    'hasOwnProperty',
                    'propertyIsEnumerable',
                    'isPrototypeOf'
                ].includes(key) // exclude meta functions
                && !stubClass.prototype[key]
            ) {
                stubClass.prototype[key] = sinon.stub();
            }
        }
        clazz = Object.getPrototypeOf(clazz);
    } while (clazz?.prototype && clazz.prototype !== Object.prototype)


    return stubClass;
};

export const memfs = (
    contents?: NestedDirectoryJSON,
    cwd?: string,
    injector?: DependencyContainer
) => {
    const fakefs = memfsModule
        .Volume
        .fromNestedJSON(
            contents || {},
            cwd
        ) as any as (typeof memfsModule.Volume & FSAPI);
    
    if (injector) {
        injector.register(InjectionTokens.fs, { useValue: fakefs });
    }

    return fakefs;
}

export const fakeChildProcess = (
    injector?: DependencyContainer,
) => {
    const childProcess = {
        spawn: sinon.stub(),
        spawnSync: sinon.stub(),
        exec: sinon.stub(),
        execSync: sinon.stub(),
        execFile: sinon.stub(),
        execFileSync: sinon.stub(),
        fork: sinon.stub(),
    } as CHILDPROCESSAPI & sinon.SinonStubbedInstance<CHILDPROCESSAPI>;

    if (injector) {
        injector.register(InjectionTokens.childProcess, { useValue: childProcess });
    }

    return childProcess;
};

export const fakeHttps = (
    injector?: DependencyContainer,
) => {
    const https = {
        get: sinon.stub(),
        request: sinon.stub(),
    } as HTTPSAPI & sinon.SinonStubbedInstance<HTTPSAPI>;

    if (injector) {
        injector.register(InjectionTokens.https, { useValue: https });
    }

    return https;
};
