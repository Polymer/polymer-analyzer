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

import {getTextContent, isCommentNode} from 'dom5';
import {ASTNode} from 'parse5';

import {ScannedPolymerLintDirective} from '../model/model';
import {matchDirective, parseDirectiveArgs} from '../polymer/polymer-lint-directive';

import {HtmlVisitor, ParsedHtmlDocument} from './html-document';
import {HtmlScanner} from './html-scanner';

export class HtmlPolymerLintDirectiveScanner implements HtmlScanner {
  async scan(
      document: ParsedHtmlDocument,
      visit: (visitor: HtmlVisitor) => Promise<void>) {
    const directives: ScannedPolymerLintDirective[] = [];
    const visitor: HtmlVisitor = (node: ASTNode) => {
      if (!isCommentNode(node)) {
        return;
      }
      const commentValue = getTextContent(node);
      const directiveMatch = matchDirective(commentValue);
      if (directiveMatch == null) {
        return;
      }

      const directiveArgs = parseDirectiveArgs(directiveMatch);
      const directiveSourceRange = document.sourceRangeForNode(node)!;

      directives.push(new ScannedPolymerLintDirective(
          `polymer-lint`, directiveArgs, directiveSourceRange, node));
    };
    await visit(visitor);

    return {features: directives};
  }
}
