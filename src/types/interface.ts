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
