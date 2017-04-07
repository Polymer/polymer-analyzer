/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import * as path from 'path';
import {parse as parseUrl_, Url} from 'url';

const unspecifiedProtocol = '-:';

/**
 * Regular expression used to split multi-line strings.  Supports the common
 * line-termination sequences of CRLF (windows) and just LF (*nix/osx)
 */
export const EOL = /\r\n|\n/g;

/**
 * LF (line-feed) aka Newline.  Using a constant to highlight its use.
 */
export const LF = '\n';

/**
 * Replace all line-terminator sequences with newline `\n`.
 *
 * @param text - String to convert.
 */
export function normalizeNewlines(text: string|string[]): string {
  if (Array.isArray(text)) {
    return text.map(normalizeNewlines).join(LF);
  }
  return text.replace(EOL, LF);
}

/**
 * Ensure path separators used match the platform's separator.
 * Backslash *is* a valid filename character in a posix
 * environment, so this function is a no-op there.
 *
 * @param pathname - file path to transform.
 */
export function convertToPlatformsPathSeparators(pathname: string): string {
  if (path.sep === '\\') {
    return pathname.replace(/\\|\//g, path.sep);
  }
  return pathname;
}

export function parseUrl(url: string): Url {
  if (!url.startsWith('//')) {
    return parseUrl_(url);
  }
  const urlObject = parseUrl_(`${unspecifiedProtocol}${url}`);
  urlObject.protocol = undefined;
  urlObject.href = urlObject.href!.replace(/^-:/, '');
  return urlObject;
}

/**
 * Ensure path separators of the posix forward-slash form when
 * running on environment (Windows) where path separator is a
 * backslash.  Backslash *is* a valid filename character in a
 * posix environment, so this function is a no-op there.
 *
 * @param pathname - file path to transform.
 */
export function posixify(pathname: string): string {
  if (path.sep === '\\') {
    return pathname.replace(/\\/g, '/');
  }
  return pathname;
}

export function trimLeft(str: string, char: string): string {
  let leftEdge = 0;
  while (str[leftEdge] === char) {
    leftEdge++;
  }
  return str.substring(leftEdge);
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
