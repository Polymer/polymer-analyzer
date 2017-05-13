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

import {CommentNode, Program} from 'espree';
import {Node} from 'estree';

import {Visitor} from '../javascript/estree-visitor';
import {JavaScriptDocument} from '../javascript/javascript-document';
import {JavaScriptScanner} from '../javascript/javascript-scanner';
import {ScannedPolymerLintDirective} from '../model/model';
import {matchDirective, parseDirectiveArgs} from '../polymer/polymer-lint-directive';


export class JavaScriptPolymerLintDirectiveScanner implements
    JavaScriptScanner {
  async scan(
      document: JavaScriptDocument,
      visit: (visitor: Visitor) => Promise<void>) {
    const visitor = new JavaScriptPolymerLintDirectiveVisitor(document);
    await visit(visitor);
    return {features: Array.from(visitor.directives)};
  }
}

class JavaScriptPolymerLintDirectiveVisitor implements Visitor {
  directives: Set<ScannedPolymerLintDirective>;
  document: JavaScriptDocument;

  constructor(document: JavaScriptDocument) {
    this.directives = new Set<ScannedPolymerLintDirective>();
    this.document = document;
  }

  enterProgram(node: Program, _: Node) {
    const allComments: CommentNode[] = node.comments || [];
    for (const comment of allComments) {
      this._enterComment(comment);
    }
  }

  _enterComment(node: CommentNode) {
    const directiveMatch = matchDirective(node.value);
    if (directiveMatch == null) {
      return;
    }

    const directiveArgs = parseDirectiveArgs(directiveMatch);
    const directiveSourceRange = this.document.sourceRangeForNode(<any>node)!;
    this.directives.add(new ScannedPolymerLintDirective(
        `polymer-lint`, directiveArgs, directiveSourceRange, node));
  }
}
