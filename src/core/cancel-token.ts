/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
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

export type CancelFunction = (reason?: any) => void;

/**
 * A partial polyfill for https://tc39.github.io/proposal-cancelable-promises/
 */
export class CancelToken {
  promise: Promise<void>;
  reason: any;

  private _cancelled = false;
  constructor(cb: (cancel: CancelFunction) => void) {
    let reject: CancelFunction;
    this.promise = new Promise<void>((_, rej) => reject = rej);

    const cancel = (reason?: any) => {
      this.reason = reason;
      this._cancelled = true;
      reject(new Cancel('cancelled'));
    };
    cb(cancel);
  }
  static source() {
    let cancel: CancelFunction = null as any;
    const token = new CancelToken((c) => {
      cancel = c;
    });
    return {token, cancel};
  }
  static never = new CancelToken(() => null);
  or<T>(thenable: PromiseLike<T>) {
    return new Promise<T>((resolve, reject) => {
      this.promise.catch(reject);
      thenable.then(resolve, reject);
    });
  }
  throwIfRequested() {
    if (this._cancelled) {
      throw new Cancel('cancelled');
    }
  }
  // TODO(rictic): implement `static race(...cancelTokens):CancelToken`
}

export class Cancel {
  constructor(public message?: string) {
  }
}

// non-standard, taken from domenic's suggestion at
// https://github.com/tc39/proposal-cancelable-promises/issues/32#issuecomment-235644656
export function isCancel(value: any): boolean {
  if (!value) {
    return false;
  }
  if (!value.constructor) {
    return false;
  }
  return value.constructor.name === 'Cancel';
}

process.on('unhandledRejection', (reason: any, p: Promise<any>) => {
  if (isCancel(reason)) {
    p.catch(() => {/*do nothing but let node know this is ok */});
  }
});
