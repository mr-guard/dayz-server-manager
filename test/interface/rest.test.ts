import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { REST } from '../../src/interface/rest';
import { Manager } from '../../src/control/manager';
import { Application, Router } from 'express';
import { Interface } from '../../src/interface/interface';


describe('Test REST', () => {

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    it('REST', async () => {

        const testManager = {
            getWebPort: () => 1234,
            config: {
                admins: [{
                    userId: 'admin',
                    password: 'admin',
                    userLevel: 'admin',
                }]
            },
            interface: new Interface(null),
        } as Manager;
        const rest = new REST(testManager);

        const registeredPaths = new Map<string, string[]>([
            ['use', []],
            ['get', []],
            ['post', []],
            ['all', []],
        ]);
        let listenCalled = false;
        let closeCalled = false;
        const appMock = {
            use: (smt, handler) => {
                if (handler) {
                    registeredPaths.get('use').push(smt);
                }
                return appMock;
            },
            get: (path, handler) => {
                registeredPaths.get('get').push(path);
                return appMock;
            },
            post: (path, handler) => {
                registeredPaths.get('post').push(path);
                return appMock;
            },
            all: (path, handler) => {
                registeredPaths.get('all').push(path);
                return appMock;
            },
            listen: (port, handler) => {
                listenCalled = true;
                handler();
                return appMock;
            },
            listening: true,
            close: (handler) => {
                closeCalled = true;
                handler();
            }
        } as any as Application;
        rest['createExpress'] = () => {
            return appMock;
        };

        const registeredRouterPaths = new Map<string, string[]>();
        const ensureArray = (key: string, value: string) => {
            registeredRouterPaths.set(key, registeredRouterPaths.get(key) ?? []);
            registeredRouterPaths.get(key).push(value);
        };
        rest.router = {
            get: (path, handler) => {
                ensureArray('get', path);
                return rest.router;
            },
            post: (path, handler) => {
                ensureArray('post', path);
                return rest.router;
            },
            delete: (path, handler) => {
                ensureArray('delete', path);
                return rest.router;
            },
            put: (path, handler) => {
                ensureArray('put', path);
                return rest.router;
            },
            use: (x, y) => {},
        } as Router;

        await rest.start();
        await rest.stop();
        
        expect(listenCalled).to.be.true;
        expect(closeCalled).to.be.true;

        expect(registeredPaths.get('use')).to.include(`/api`);
        expect(registeredPaths.get('all')).to.include(`*`);
        expect(registeredPaths.get('get')).to.include(`/login`);
        expect(registeredPaths.get('get')).to.include(`/dashboard`);
        expect(registeredPaths.get('post')).to.include(`/ingame/stats`);

        testManager.interface.commandMap.forEach(
            (template, key) => {
                if (!template.disableRest) {
                    expect(
                        registeredRouterPaths.get(template.method)
                    ).to.include(`/${key}`);
                }
            },
        );
        
    });

    it('REST-handleCommand', async () => {

        let lastExecuted;
        const testManager = {
            initDone: false,
            interface: {
                execute: (req) => {
                    lastExecuted = req;
                    return {
                        status: 200,
                        body: 'ok',
                    };
                },
            } as any,
        } as Manager;
        const rest = new REST(testManager);
        
        const req = {
            headers: {
                authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
            },
            body: 'test',
            query: {},
            resource: 'testResource',
        } as any;
        
        let resResponseCode;
        let resBody;
        const res = {
            sendStatus: (code) => resResponseCode = code,
            status: (code) => {
                resResponseCode = code;
                return res;
            },
            send: (body) => resBody = body,
        } as any;

        await rest['handleCommand'](req, res, 'testResource');
        expect(resResponseCode).to.equal(503);
        expect(resBody).to.be.undefined;

        testManager.initDone = true;
        resResponseCode = undefined;
        resBody = undefined;
        
        await rest['handleCommand'](req, res, 'testResource');
        expect(resResponseCode).to.equal(200);
        expect(resBody).to.be.not.undefined;

        expect(lastExecuted).to.be.not.undefined;
        expect(lastExecuted.body).to.equal(req.body);
        expect(lastExecuted.resource).to.equal('testResource');
        expect(lastExecuted.user).to.equal('admin');
        
    });

    it('REST-handleCommand', async () => {

        const rest = new REST(null);
        
        const host = 'testhost';
        const req = {
            header: (h) => {
                if (h === 'Origin') return host;
                return null;
            },
            method: 'OPTIONS'
        } as any;
        
        let resResponseCode;
        let addedHeaders = new Map<string, string>();
        const res = {
            sendStatus: (code) => resResponseCode = code,
            header: (key, val) => addedHeaders.set(key, val),
        } as any;

        let nextCalled = false;
        
        await rest['handleCors'](req, res, () => nextCalled = true,);
        expect(resResponseCode).to.equal(204);
        expect(nextCalled).to.be.false;
        expect([...addedHeaders.keys()]).to.include('Access-Control-Allow-Origin');
        expect([...addedHeaders.keys()]).to.include('Access-Control-Allow-Headers');
        expect([...addedHeaders.keys()]).to.include('Access-Control-Allow-Credentials');

        expect(addedHeaders.get('Access-Control-Allow-Origin')).to.equal(host);

        resResponseCode = undefined;
        addedHeaders.clear();
        req.method = 'GET';
        await rest['handleCors'](req, res, () => nextCalled = true,);
        expect(resResponseCode).to.be.undefined;
        expect(nextCalled).to.be.true;
        expect([...addedHeaders.keys()]).to.include('Access-Control-Allow-Origin');
        expect([...addedHeaders.keys()]).to.include('Access-Control-Allow-Headers');
        expect([...addedHeaders.keys()]).to.include('Access-Control-Allow-Credentials');

        expect(addedHeaders.get('Access-Control-Allow-Origin')).to.equal(host);
        
    });

    it('REST-handleUiRequest', async () => {

        const rest = new REST(null);
        
        let sentFile;
        const res = {
            sendFile: (file) => sentFile = file,
        } as any;

        await rest['handleUiFileRequest']({} as any, res);
        expect(sentFile).to.include('index.html');

    });

    it('REST-handleIngameRequest', () => {

        let executed = false;
        const rest = new REST({
            getIngameToken: () => 'asdf',
            ingameReport: {
                processIngameReport: (body) => {
                    executed = true;
                }
            }
        } as any);
        
        let sent = false;
        const res = {
            send: () => sent = true,
        } as any;

        rest['handleIngameRequest']({
            query: {
                token: '1234'
            }
        } as any, res);
        expect(sent).to.be.true;
        expect(executed).to.be.false;

        sent = false;
        executed = false;
        rest['handleIngameRequest']({
            query: {
                token: 'asdf'
            }
        } as any, res);
        expect(sent).to.be.true;
        expect(executed).to.be.true;

    });

});
