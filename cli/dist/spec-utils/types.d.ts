export declare type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
