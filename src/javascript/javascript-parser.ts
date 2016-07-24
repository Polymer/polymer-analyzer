/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import * as acorn from 'acorn';
import {Program} from 'estree';
import * as estraverse from 'estraverse';

import {Analyzer} from '../analyzer';
import {Parser} from '../parser/parser';
import {JavaScriptDocument} from './javascript-document';
import {Visitor} from '../ast-utils/fluent-traverse';

export class JavaScriptParser implements Parser<JavaScriptDocument> {

  analyzer: Analyzer;

  constructor(analyzer: Analyzer) {
    this.analyzer = analyzer;
  }

  parse(contents: string, url: string): JavaScriptDocument {
    // TODO(justinfagnani): add onComment handler
    const ast = <Program>acorn.parse(contents, {
      ecmaVersion: 7,
      sourceType: 'script',
      locations: true,
    });

    return new JavaScriptDocument({
      url,
      contents,
      ast,
    });
  }

}