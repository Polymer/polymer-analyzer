import {parse as parseUrl_, Url} from 'url';

const unspecifiedProtocol = '-:';

export function parseUrl(url: string): Url {
  if (!url.startsWith('//')) {
    return parseUrl_(url);
  }
  const urlObject = parseUrl_(`${unspecifiedProtocol}${url}`);
  urlObject.protocol = undefined;
  urlObject.href = urlObject.href!.replace(/^-:/, '');
  return urlObject;
}

export function trimLeft(str: string, char: string): string {
  let leftEdge = 0;
  while (str[leftEdge] === char) {
    leftEdge++;
  }
  return str.substring(leftEdge);
}

export function isPathInside(directory: string, filePath: string): boolean {
  if (process.platform === 'win32') {
    return filePath.toLowerCase().startsWith(directory);
  }
  return filePath.startsWith(directory);
}

export class Deferred<T> {
  promise: Promise<T>;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  resolved = false;
  rejected = false;
  error: any;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (result: T) => {
        if (this.resolved) {
          throw new Error('Already resolved');
        }
        if (this.rejected) {
          throw new Error('Already rejected');
        }
        this.resolved = true;
        resolve(result);
      };
      this.reject = (error: Error) => {
        if (this.resolved) {
          throw new Error('Already resolved');
        }
        if (this.rejected) {
          throw new Error('Already rejected');
        }
        this.rejected = true;
        this.error = error;
        reject(error);
      };
    });
  }

  toNodeCallback() {
    return (error: any, value: T) => {
      if (error) {
        this.reject(error);
      } else {
        this.resolve(value);
      }
    };
  }
}

export function addAll<T>(set1: Set<T>, set2: Set<T>): Set<T> {
  for (const val of set2) {
    set1.add(val);
  }
  return set1;
}
