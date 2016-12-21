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

import * as dom5 from 'dom5';
import {ASTNode} from 'parse5';

import * as jsdoc from '../javascript/jsdoc';
import {annotateElementHeader} from './docs';

import {HtmlVisitor, ParsedHtmlDocument} from '../html/html-document';
import {Visitor} from '../javascript/estree-visitor';
import {JavaScriptDocument} from '../javascript/javascript-document';
import {JavaScriptScanner} from '../javascript/javascript-scanner';
import {HtmlScanner} from '../html/html-scanner';
import {ScannedPolymerElement} from './polymer-element';

function parseComment(comment: string): ScannedPolymerElement|undefined {
  const parsedJsdoc = jsdoc.parseJsdoc(comment);
  const pseudoTag = jsdoc.getTag(parsedJsdoc, 'pseudoElement', 'name');
  if (pseudoTag) {
    const element = new ScannedPolymerElement({
      tagName: pseudoTag,
      jsdoc: {description: parsedJsdoc.description, tags: parsedJsdoc.tags},
      properties: [],
      description: parsedJsdoc.description,
      sourceRange: undefined
    });
    element.pseudo = true;
    annotateElementHeader(element);
    return element;
  }
}
/**
 * A Polymer pseudo-element is an element that is declared in an unusual way, such
 * that the analyzer couldn't normally analyze it, so instead it is declared in
 * comments.
 */
export class PseudoElementScanner implements HtmlScanner, JavaScriptScanner {
  async scanHtml(
      document: ParsedHtmlDocument,
      visit: (visitor: HtmlVisitor) => Promise<void>):
      Promise<ScannedPolymerElement[]> {
    const elements: ScannedPolymerElement[] = [];

    await visit((node: ASTNode) => {
      if (dom5.isCommentNode(node) && node.data && node.data.includes('@pseudoElement')) {
        const element = parseComment(node.data);
        if (element) {
          element.sourceRange = document.sourceRangeForNode(node);
          elements.push(element);
        }
      }
    });
    return elements;
  }

  async scanJs(document: JavaScriptDocument): Promise<ScannedPolymerElement[]> {
    const elements: ScannedPolymerElement[] = [];

    for (const comment of document.ast.comments) {
        const element = parseComment(comment.value);
        if (element) {
          element.sourceRange = document.sourceRangeForNode(comment);
          elements.push(element);
        }
    }

    return elements;
  }

  async scan(
      document: JavaScriptDocument, visit: (visitor: Visitor) => Promise<void>):
      Promise<ScannedPolymerElement[]>;
  async scan(
      document: ParsedHtmlDocument,
      visit: (visitor: HtmlVisitor) => Promise<void>):
      Promise<ScannedPolymerElement[]>;
  async scan(document: any, visit: any): Promise<any> {
    if (document instanceof JavaScriptDocument) {
      return this.scanJs(document);
    } else if (document instanceof ParsedHtmlDocument) {
      return this.scanHtml(document, visit);
    } else {
      return [];
    }
  }
}
