/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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

export type Result<V, E> = Success<V, E>|Failure<V, E>;

export namespace Result {
  export function succeed<V>(value: V) {
    return new Success<V, never>(value);
  }
  export function fail<E>(error: E) {
    return new Failure<never, E>(error);
  }
}

export class Success<V, E> {
  readonly successful: true;
  readonly value: V;
  constructor(value: V) {
    this.value = value;
  }

  unwrapOr(_fallback: V): V {
    return this.value;
  }

  unwrapOrCompute(_compute: (e: E) => V): V {
    return this.value;
  }

  andThen<U>(f: (v: V) => Result<U, E>): Result<U, E> {
    return f(this.value);
  }

  map<U>(f: (v: V) => U): Result<U, E> {
    return Result.succeed(f(this.value));
  }

  mapFailure<F>(_f: (e: E) => F): Result<V, F> {
    return this as Result<V, any>;
  }

  and<U>(res: Result<U, E>): Result<U, E> {
    return res;
  }

  or<F>(_res: Result<V, F>): Result<V, F> {
    return this as Result<V, any>;
  }

  orElse<F>(_op: (e: E) => Result<V, F>): Result<V, F> {
    return this as Result<V, any>;
  }

  unwrap(): V {
    return this.value;
  }

  unwrapFailure(): E {
    throw new Error(
        `Expected Result to be failed, it succeeded with: ${this.value}`);
  }

  * [Symbol.iterator](): Iterable<V> {
    if (this.successful) {
      yield this.value as V;
    }
  }
}
(Success.prototype as any).successful = true;

export class Failure<V, E> {
  readonly successful: false;
  readonly error: E;
  constructor(error: E) {
    this.error = error;
  }

  unwrapOr(fallback: V): V {
    return fallback;
  }

  unwrapOrCompute(compute: (e: E) => V): V {
    return compute(this.error);
  }

  andThen<U>(_f: (v: V) => Result<U, E>): Result<U, E> {
    return this as Result<any, E>as Result<U, E>;
  }

  map<U>(_f: (v: V) => U): Result<U, E> {
    return this as Result<any, E>as Result<U, E>;
  }

  mapFailure<F>(f: (e: E) => F): Result<V, F> {
    return Result.fail(f(this.error));
  }

  and<U>(_res: Result<U, E>): Result<U, E> {
    return this as Result<any, E>;
  }

  or<F>(res: Result<V, F>): Result<V, F> {
    return res;
  }

  orElse<F>(op: (e: E) => Result<V, F>): Result<V, F> {
    return op(this.error);
  }

  unwrap(): V {
    throw new Error(`Tried to unwrap a failed Result of: ${this.error}`);
  }

  unwrapFailure(): E {
    return this.error;
  }

  * [Symbol.iterator](): Iterable<V> {
  }
}
(Failure.prototype as any).successful = false;
