export interface Event<T> {
    (listener: (e: T) => void): Disposable;
}
export declare class NodeEventEmitter<T> {
    private register?;
    private nodeEmitter;
    constructor(register?: {
        on: () => void;
        off: () => void;
    } | undefined);
    event: Event<T>;
    fire(data: T): void;
    dispose(): void;
}
export interface ResultEvent<E, R> {
    (listener: (e: E) => R): Disposable;
}
export declare class ResultEventEmitter<E, R> {
    private nodeEmitter;
    event: ResultEvent<E, R>;
    fire(data: E): R[];
    dispose(): void;
}
export interface Disposable {
    dispose(): void;
}
