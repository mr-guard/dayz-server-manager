import { injectable, singleton } from 'tsyringe';
import { Logger } from '../util/logger';

@singleton()
@injectable()
export class LoggerFactory {

    public createLogger(context: string): Logger {
        return new Logger(context);
    }

}
