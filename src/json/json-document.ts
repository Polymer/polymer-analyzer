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


import {Document, Options} from '../parser/document';

export interface Visitor { 'I should not have implemented this'(): never; }

export class JsonDocument extends Document<Object, Visitor> {
  type = 'json';

  constructor(from: Options<Object>) {
    super(from);
  }

  visit(visitors: Visitor[]) {
    throw new Error('Not implemented');
  }

  forEachNode(callback: (node: any) => void) {
    throw new Error('Not implemented');
  }
}
