declare module 'memory-streams' {
  import {Readable, Writable} from 'stream';
  export const ReadableStream: {new (contents: string): Readable;};

  export const WritableStream: {new (): Writable;};
}