import {Resolvable, SourceRange, Feature} from '../model/model';
import {Warning} from '../warning/warning';
import * as dom5 from 'dom5';

export interface Attribute {
  name: string;
  sourceRange: SourceRange|undefined;
  nameSourceRange: SourceRange|undefined;
  valueSourceRange: SourceRange|undefined;
  value?: string;
}

export class ElementReference implements Feature {
  tagName: string;
  attributes: Attribute[] = [];
  sourceRange: SourceRange;
  astNode: dom5.Node;
  warnings: Warning[];
  kinds: Set<string> = new Set(['element-reference']);

  get identifiers(): Set<string> {
    return new Set([this.tagName]);
  }
}

export class ScannedElementReference implements Resolvable {
  tagName: string;
  attributes: Attribute[] = [];
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

