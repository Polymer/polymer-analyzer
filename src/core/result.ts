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

export type Result<V, E> = Success<V, E>| Failure<V, E>;

export namespace Result {
  export function succeed<V>(value: V) {
    return new Success<V, any>(value);
  }
  export function fail<E>(error: E) {
    return new Failure<any, E>(error);
  }
}

export class Success<V, E> {
  readonly successful: true = true;
  readonly value: V;
  constructor(value: V) {
    this.value = value;
  }

  unwrapOr(_fallback: V): V {
    return this.value;
  }

  andThen<U>(f: (v: V) => Result<U, E>): Result<U, E> {
    return f(this.value);
  }

  map<U>(f: (v: V) => U): Result<U, E> {
    return Result.succeed(f(this.value));
  }

  mapFailure<F>(_f: (e: E) => F): Result<V, F> {
    return this as Result<V, any>as Result<V, F>;
  }

  and<U>(res: Result<U, E>): Result<U, E> {
    return res;
  }

  or<F>(_res: Result<V, F>): Result<V, F> {
    return this as Result<V, any>as Result<V, F>;
  }

  orElse<F>(_op: (e: E) => Result<V, F>): Result<V, F> {
    return this as Result<V, any>as Result<V, F>;
  }

  unwrap(): V {
    return this.value;
  }

  unwrapFailure(): E {
    throw new Error(
        `Expected Result to be failed, it succeeded with: ${this.value}`);
  }

  unwrapOrDefault(): V|undefined {
    return this.value;
  }

  * [Symbol.iterator](): Iterable<V> {
    if (this.successful) {
      yield this.value as V;
    }
  }
}

export class Failure<V, E> {
  readonly successful: false = false;
  readonly value: E;
  constructor(value: E) {
    this.value = value;
  }

  unwrapOr(fallback: V): V {
    return fallback;
  }

  andThen<U>(_f: (v: V) => Result<U, E>): Result<U, E> {
    return this as Result<any, E>as Result<U, E>;
  }

  map<U>(_f: (v: V) => U): Result<U, E> {
    return this as Result<any, E>as Result<U, E>;
  }

  mapFailure<F>(f: (e: E) => F): Result<V, F> {
    return Result.fail(f(this.value));
  }

  and<U>(_res: Result<U, E>): Result<U, E> {
    return this as Result<any, E>as Result<U, E>;
  }

  or<F>(res: Result<V, F>): Result<V, F> {
    return res;
  }

  orElse<F>(op: (e: E) => Result<V, F>): Result<V, F> {
    return op(this.value);
  }

  unwrap(): V {
    throw new Error(`Tried to unwrap a failed Result of: ${this.value}`);
  }

  unwrapFailure(): E {
    return this.value;
  }

  unwrapOrDefault(): V|undefined {
    return undefined;
  }

  * [Symbol.iterator](): Iterable<V> {
  }
}

function resultLiteral() {
  if (Math.random() < 0.5) {
    return {successful: false, value: 'sad'};
  }
  return {successful: true, value: 10};
}

function resultInstance() {
  if (Math.random() < 0.5) {
    return Result.fail('sad');
  }
  return Result.succeed(10);
}

const N = 1000 * 1000 * 10;

function instanceTest() {
  const start = +new Date;
  const arr = [];
  for (let i = 0; i < N; i++) {
    arr.push(resultInstance());
  }
  console.log(`${MiB()} memory used`);
  console.log(`${((+new Date) - start)
                  .toFixed(0)}ms to create ${arr.length} instances.`);
}

function literalTest() {
  const start = +new Date;
  const arr = [];
  for (let i = 0; i < N; i++) {
    arr.push(resultLiteral());
  }
  console.log(`${MiB()} memory used`);
  console.log(`${((+new Date) - start)
                  .toFixed(0)}ms to create ${arr.length} literals.`);
}

function MiB() {
  const usage = process.memoryUsage().rss;
  return `${(usage / (1024 * 1024)).toFixed(1)}MiB`;
}


if (process.argv[2] === 'literal') {
  literalTest();
} else if (process.argv[2] === 'instance') {
  instanceTest();
}
