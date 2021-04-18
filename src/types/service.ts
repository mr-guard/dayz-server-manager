export interface StatefulService {
    start(): Promise<void>;
    stop(): Promise<void>;
}
