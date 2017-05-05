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

/**
 * A map from keys to promises of values. Used for caching asynchronous work.
 *
 * This cache is write-only and can only be queried by also providing a function
 * to compute the given key if it does not exist. To delete entries from the
 * cache you must fork it.
 *
 * This design is useful in the analyzer, as later stages of analysis can
 * assume that earlier stages have finished. When a file is changed, we must
 * remove it from the cache that future requests will use, but existing requests
 * should be unaffected.
 */
export class AsyncWorkCache<K, V> {
  private _keyToResultMap: SetOnlyMap<K, Promise<V>>;

  /**
   * @param startingMap Initial values of the cache. This must not be modified
   *     by anything other than the AsyncWorkCache after it's been passed in.
   */
  constructor(startingMap?: Map<K, Promise<V>>) {
    if (startingMap) {
      this._keyToResultMap = startingMap;
    } else {
      this._keyToResultMap = new Map();
    }
  }

  /**
   * If work has already begun to compute the given key, return a promise for
   * the result of that work.
   *
   * If not, compute it with the given function.
   *
   * This method ensures that we will only try to compute the value for `key`
   * once, no matter how often or with what timing getOrCompute is called, even
   * recursively.
   */
  async getOrCompute(key: K, compute: () => Promise<V>) {
    const cachedResult = this._keyToResultMap.get(key);
    if (cachedResult) {
      return cachedResult;
    }
    const promise = (async() => {
      // Make sure we wait and return a Promise before doing any work, so that
      // the Promise is cached before control flow enters compute().
      await Promise.resolve();
      return compute();
    })();
    this._keyToResultMap.set(key, promise);
    return promise;
  }

  /**
   * Returns a copy of the underlying map which can be mutated as necessary
   * and then used to create another cache.
   */
  fork(): Map<K, Promise<V>> {
    return new Map(this._keyToResultMap);
  }
}

/**
 * A map whose entries may not be deleted.
 */
export interface SetOnlyMap<K, V> extends ReadonlyMap<K, V> {
  [Symbol.iterator](): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  set(key: K, value: V): void;
}
