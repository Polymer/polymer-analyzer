import {HtmlScanner} from './html-scanner';
import {ParsedHtmlDocument, HtmlVisitor} from './html-document';
import {Resolvable, SourceRange, Feature} from '../model/model';
import {Warning} from '../warning/warning';
import * as dom5 from 'dom5';

const isCustomElement = dom5.predicates.hasMatchingTagName(/(.+-)+.+/);

export interface ScannedAttribute {
  name: string;
  sourceRange: SourceRange|undefined;
  value?: string;
}

export class ElementReference implements Feature {
  tagName?: string;
  attributes: ScannedAttribute[] = [];
  sourceRange: SourceRange;
  astNode: dom5.Node;
  warnings: Warning[];
  kinds: Set<string> = new Set(['element-reference']);

  get identifiers(): Set<string> {
    const result: Set<string> = new Set();
    if (this.tagName) {
      result.add(this.tagName);
    }
    return result;
  }
}

export class ScannedElementReference implements Resolvable {
  tagName?: string;
  attributes: ScannedAttribute[] = [];
  sourceRange: SourceRange;
  astNode: dom5.Node;
  warnings: Warning[];

  constructor(
    tagName: string, sourceRange: SourceRange,
    ast: dom5.Node) {
      this.tagName = tagName;
      this.sourceRange = sourceRange;
      this.astNode = ast;
  }

  resolve(): ElementReference {
    const ref = new ElementReference();
    Object.assign(ref, this);
    return ref;
  }
}

export class HtmlElementReferenceScanner implements HtmlScanner {
  async scan(
    document: ParsedHtmlDocument,
    visit: (visitor: HtmlVisitor) => Promise<void>):
    Promise<ScannedElementReference[]> {
      let elements: ScannedElementReference[] = [];

      await visit((node) => {
        console.log(node.nodeName, isCustomElement(node));
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
