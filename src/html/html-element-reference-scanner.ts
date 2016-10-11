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
        if (isCustomElement(node) && node.nodeName !== 'dom-module') {
          elements.push(new ScannedElementReference(
            node.nodeName,
            document.sourceRangeForNode(node)!,
            node));
        }
      });

      return elements;
    }
}
