interface WASMModule {
    exports: Object;
}

interface WASMInstance {

}

interface WASMMemory {

}

interface WASMTable {}

declare module WebAssembly {
    export function compile(bytes: ArrayBuffer): Promise<WASMModule>;
    export function instantiate(module: WASMModule, importObject: Object): Promise<WASMInstance>;
    
    export class Memory {
        constructor (initial: { initial: number })
        buffer: ArrayBuffer
    }

    export class Table {
        constructor (initial: { initial: number, element: 'anyfunc' });
    }
}