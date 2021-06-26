import 'reflect-metadata';
import { Manager } from '../control/manager';

export class IService {

    public constructor(public manager: Manager) {}

}

export abstract class IStatefulService extends IService {

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

}

export interface ServiceConfig {
    type: typeof IService;
    stateful: boolean;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Service = (config: ServiceConfig): PropertyDecorator => (cls, prop) => {
    const serviceProps: (string | symbol)[] = Reflect.getMetadata('services', cls) ?? [];
    if (!serviceProps.includes(prop)) {
        serviceProps.push(prop);
        Reflect.defineMetadata('services', serviceProps, cls);
    }
    Reflect.defineMetadata('service', config, cls, prop);
};

