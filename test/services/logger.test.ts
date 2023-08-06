import { expect } from '../expect';
import * as sinon from 'sinon';

import { Logger, LogLevel } from '../../src/util/logger';
import { LoggerFactory } from '../../src/services/loggerfactory';


describe('Test class Logger', () => {

    const origLog = Logger.LogLevelFncs[LogLevel.ERROR];

    after(() => {
        Logger.LogLevelFncs[LogLevel.ERROR] = origLog;
    });

    it('Logger-logAllInputs', () => {

        const stub = sinon.stub();;

        Logger.LogLevelFncs[LogLevel.ERROR] = stub;

        const logger = new LoggerFactory().createLogger('TestContext');
        
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
