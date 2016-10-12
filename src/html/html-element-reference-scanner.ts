import {HtmlScanner} from './html-scanner';
import {ParsedHtmlDocument, HtmlVisitor} from './html-document';
import * as dom5 from 'dom5';
import {ScannedElementReference} from '../model/element-reference';

const isCustomElement = dom5.predicates.hasMatchingTagName(/(.+-)+.+/);

export class HtmlElementReferenceScanner implements HtmlScanner {
  async scan(
    document: ParsedHtmlDocument,
    visit: (visitor: HtmlVisitor) => Promise<void>):
    Promise<ScannedElementReference[]> {
      let elements: ScannedElementReference[] = [];

      await visit((node) => {
        if (node.tagName && isCustomElement(node) && node.nodeName !== 'dom-module') {
          const element = new ScannedElementReference(
            node.tagName,
            document.sourceRangeForNode(node)!,
            node);

          if (node.attrs) {
            for (const attr of node.attrs) {
              element.attributes.push({
                name: attr.name,
                value: attr.value,
                sourceRange: document.sourceRangeForAttribute(node, attr.name),
                nameSourceRange: document.sourceRangeForAttributeName(node, attr.name),
                valueSourceRange: document.sourceRangeForAttributeValue(node, attr.name)
              });
            }
          }

          elements.push(element);
        }
      });

      return elements;
    }
}
