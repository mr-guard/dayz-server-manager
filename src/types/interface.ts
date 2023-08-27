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
    public canStream?: boolean;
    public uuid?: string;

}

export class Response {

    public constructor(
        public status: number,
        public body: string | unknown,
        public uuid?: string,
    ) {}

}

export type ResponsePart = Omit<Response, 'status'>;
export type ResponsePartHandler = (responsePart: ResponsePart) => Promise<any>;

export interface RequestOptions {
    partialResponseCallback: ResponsePartHandler,
}

export type RequestHandler = (request: Request, params: Record<string, any>, options: RequestOptions) => any;
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
    public params: { name: string, optional?: boolean, location?: 'body' | 'query', parse?: (val: any) => any }[] = [];
    public noResponse?: boolean;

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
