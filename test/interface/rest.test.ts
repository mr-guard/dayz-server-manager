import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'
import { REST } from '../../src/interface/rest';
import { Manager } from '../../src/control/manager';
import { Application, Router } from 'express';
import { Interface, InterfaceDispatcher } from '../../src/interface/interface';
import { StubInstance, stubClass } from '../util';
import { DependencyContainer, Lifecycle, container } from 'tsyringe';
import * as sinon from 'sinon';


describe('Test REST', () => {

    let injector: DependencyContainer;

    let manager: StubInstance<Manager>;
    let dispatcher: StubInstance<InterfaceDispatcher>;
    let interfaceService: StubInstance<Interface>;

    beforeEach(() => {
        // restore mocks
        ImportMock.restore();

        container.reset();
        injector = container.createChildContainer();

        injector.register(Manager, stubClass(Manager), { lifecycle: Lifecycle.Singleton });
        injector.register(InterfaceDispatcher, stubClass(InterfaceDispatcher), { lifecycle: Lifecycle.Singleton });
        injector.register(Interface, stubClass(Interface), { lifecycle: Lifecycle.Singleton });
        
        manager = injector.resolve(Manager) as any;
        manager.initDone = true;

        dispatcher = injector.resolve(InterfaceDispatcher) as any;
        interfaceService = injector.resolve(Interface) as any;
    });

    it('REST', async () => {

        manager.getWebPort.returns(1234);
        (manager as any).config = {
            admins: [{
                userId: 'admin',
                password: 'admin',
                userLevel: 'admin',
            }]
        };

        Interface.prototype['setupCommandMap'].apply(interfaceService);
        dispatcher.getCommands.returns(interfaceService.commandMap);

        const rest = injector.resolve(REST);

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
                    registeredPaths.get('use')!.push(smt);
                }
                return appMock;
            },
            get: (path, handler) => {
                registeredPaths.get('get')!.push(path);
                return appMock;
            },
            post: (path, handler) => {
                registeredPaths.get('post')!.push(path);
                return appMock;
            },
            all: (path, handler) => {
                registeredPaths.get('all')!.push(path);
                return appMock;
            },
            listen: (port, host, handler) => {
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
        sinon.stub(rest, 'createExpress').returns(appMock);

        const registeredRouterPaths = new Map<string, string[]>();
        const ensureArray = (key: string, value: string) => {
            registeredRouterPaths.set(key, registeredRouterPaths.get(key) ?? []);
            registeredRouterPaths.get(key)!.push(value);
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

        dispatcher.getCommands().forEach(
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

        dispatcher.execute.resolves({
            status: 200,
            body: 'ok',
        });

        manager.initDone = false;

        const rest = injector.resolve(REST);
        
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

        manager.initDone = true;
        resResponseCode = undefined;
        resBody = undefined;
        
        await rest['handleCommand'](req, res, 'testResource');
        expect(resResponseCode).to.equal(200);
        expect(resBody).to.be.not.undefined;

        expect(dispatcher.execute.called).to.be.true;
        expect(dispatcher.execute.firstCall.firstArg.body).to.equal(req.body);
        expect(dispatcher.execute.firstCall.firstArg.resource).to.equal('testResource');
        expect(dispatcher.execute.firstCall.firstArg.user).to.equal('admin');
        
    });

    it('REST-handleCommand-cors', async () => {

        const rest = injector.resolve(REST);
        
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

        const rest = injector.resolve(REST);
        
        let sentFile;
        const res = {
            sendFile: (file) => sentFile = file,
        } as any;

        await rest['handleUiFileRequest']({} as any, res);
        expect(sentFile).to.include('index.html');

    });

});
