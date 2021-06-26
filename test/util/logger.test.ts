import { expect } from '../expect';
import { ImportMock } from 'ts-mock-imports'

import { Logger, LogLevel } from '../../src/util/logger';


describe('Test class Logger', () => {

    const origLog = Logger.LogLevelFncs[LogLevel.ERROR];
    
    beforeEach(() => {
        // restore mocks
        ImportMock.restore();
    });

    after(() => {
        Logger.LogLevelFncs[LogLevel.ERROR] = origLog;
    });

    it('Logger-logAllInputs', () => {

        const stub = ImportMock.mockFunction(console, 'error');

        Logger.LogLevelFncs[LogLevel.ERROR] = stub;

        const logger = new Logger('TestContext');
        
        const errorMsg = 'TestErrorMessage!!!';
        logger.log(
            LogLevel.ERROR,
            errorMsg,
            '1',
            '2',
            '3',
        );

        expect(stub.callCount).to.equal(1);
        
        // logs all params
        const params = stub.firstCall.args[1];
        expect(params).to.be.not.undefined;
        expect(params.length).to.equal(3);
        
        // msg contains all data
        const msg = stub.firstCall.args[0];

        expect(msg).to.include('ERROR');
        expect(msg).to.include('TestContext'.slice(0, logger.MAX_CONTEXT_LENGTH));
        expect(msg).to.include('ERROR');
        expect(msg).to.include(errorMsg);
        
        // expect ISO date
        expect(msg).to.match(/@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z.*/g);
    });

});
