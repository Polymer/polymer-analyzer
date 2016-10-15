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
import {ScannedElementReference} from '../model/element-reference';
import {HtmlVisitor, ParsedHtmlDocument} from './html-document';
import {HtmlScanner} from './html-scanner';

const isCustomElement = dom5.predicates.hasMatchingTagName(/(.+-)+.+/);

export class HtmlElementReferenceScanner implements HtmlScanner {
  matches(node: ASTNode): boolean {
    return !!node;
  }

  async scan(
      document: ParsedHtmlDocument,
      visit: (visitor: HtmlVisitor) => Promise<void>):
      Promise<ScannedElementReference[]> {
    let elements: ScannedElementReference[] = [];

    await visit((node) => {
      if (node.tagName && this.matches(node)) {
        const element = new ScannedElementReference(
            node.tagName, document.sourceRangeForNode(node)!, node);

        if (node.attrs) {
          for (const attr of node.attrs) {
            element.attributes.push({
              name: attr.name,
              value: attr.value,
              sourceRange: document.sourceRangeForAttribute(node, attr.name)!,
              nameSourceRange:
                  document.sourceRangeForAttributeName(node, attr.name)!,
              valueSourceRange:
                  document.sourceRangeForAttributeValue(node, attr.name)
            });
          }
        }

        elements.push(element);
      }
    });

    return elements;
  }
}

export class HtmlCustomElementReferenceScanner extends
    HtmlElementReferenceScanner {
  matches(node: ASTNode): boolean {
    return isCustomElement(node) && node.nodeName !== 'dom-module';
  }
}
