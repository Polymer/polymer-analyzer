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
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
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
