import { UserLevel } from '../config/config';
import { merge } from '../util/merge';
import { constants as HTTP } from 'http2';

export class Request {

    public resource: string = '';
    public accept?: 'application/json' | 'text/plain' | string = 'application/json';
    public body?: any;
    public query?: any;
    public user?: string;
    public channel?: string;

}

export class Response {

    public constructor(
        public status: number,
        public body: string | unknown,
    ) {}

}

export type RequestHandler = (request: Request) => Promise<Response>;
export type RequestMethods = 'get' | 'post' | 'put' | 'delete';

export class RequestTemplate {

    /* istanbul ignore next */
    public action: RequestHandler = async (r) => {
        return {
            status: HTTP.HTTP_STATUS_GONE,
            body: `Unknown Resource: ${r?.resource}`,
        };
    };

    public level: UserLevel = 'admin';
    public method: RequestMethods = 'get';
    public params: string[] = [];
    public paramsOptional?: boolean = false;

    public disableDiscord?: boolean = false;
    public discordPublic?: boolean = false;
    public disableRest?: boolean = false;

    public static build(optionals: {
        [Property in keyof RequestTemplate]?: RequestTemplate[Property];
    }): RequestTemplate {
        return merge(new RequestTemplate(), optionals);
    }

}

export type CommandMap = Map<string, RequestTemplate>;
