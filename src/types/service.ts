import { Logger } from '../util/logger';

export class IService {

    public constructor(
        protected log: Logger,
    ) {}

}

export abstract class IStatefulService extends IService {

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

}

export interface ServiceConfig {
    type: typeof IService;
    stateful: boolean;
}
