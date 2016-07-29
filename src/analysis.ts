import {Descriptor, DocumentDescriptor, ElementDescriptor, InlineDocumentDescriptor, PropertyDescriptor} from './ast/ast';
import {Document} from './parser/document';
import {Element, Event, Property, SerializedAnalysis} from './serialized-analysis';

export class Analysis {
  descriptors_: DocumentDescriptor[];
  constructor(descriptors: DocumentDescriptor[]) {
    this.descriptors_ = descriptors;
  }



  serialize(): SerializedAnalysis {
    const elementDescriptors = gatherElements(this);
    let elements: Element[] = [];
    for (const elementDescriptorPair of elementDescriptors) {
      elements.push(serializeElementDescriptor(
          elementDescriptorPair[0], elementDescriptorPair[1]));
    }
    return {packages: [{elements: elements}]};
  }
}

function serializeElementDescriptor(
    elementDescriptor: ElementDescriptor, path: string): Element {
  const propChangeEvents: Event[] =
      elementDescriptor.properties.filter(p => p.notify)
          .map(p => ({
                 name: `${p.name}-changed`,
                 type: 'CustomEvent',
                 description: `Fired when the \`${p.name}\` property changes.`
               }));

  return {
    tagname: elementDescriptor.is,
    description: '',
    superclass: 'HTMLElement',
    path: path,
    attributes: [],
    properties: elementDescriptor.properties.map(serializePropertyDescriptor),
    styling: {
      cssVariables: [],
      classes: [],
    },
    demos: (elementDescriptor.demos || []).map(d => d.path),
    slots: [],
    events: propChangeEvents,
    metadata: {},
  };
}

function serializePropertyDescriptor(p: PropertyDescriptor): Property {
  const property: Property = {
    name: p.name,
    type: p.type || '?',
    description: p.desc || '',
  };
  if (p.default) {
    property.defaultValue = JSON.stringify(p.default);
  }
  const polymerMetadata: any = {};
  const polymerMetadataFields = ['notify', 'observer', 'readOnly'];
  for (const field of polymerMetadataFields) {
    if (field in p) {
      polymerMetadata[field] = p[field];
    }
  }
  property.metadata = {polymer: polymerMetadata};
  return property;
}

function gatherElements(analysis: Analysis) {
  const gatherer = new ElementGatherer();
  const walker = new AnalysisWalker(analysis).walk([gatherer]);
  return Array.from(gatherer.elements).map((el) => {
    return <[ElementDescriptor, string]>[el, gatherer.elementPaths.get(el)];
  });
}

abstract class AnalysisVisitor {
  visitDocumentDescriptor?(dd: DocumentDescriptor, path: Descriptor[]): void;
  visitInlineDocumentDescriptor?
      (dd: InlineDocumentDescriptor<any>, path: Descriptor[]): void;
  visitElement?(element: ElementDescriptor, path: Descriptor[]): void;
  visitDocument?(document: Document<any, any>, path: Descriptor[]): void;
}

class ElementGatherer implements AnalysisVisitor {
  elements = new Set<ElementDescriptor>();
  elementPaths = new Map<ElementDescriptor, string>();
  visitElement(element: ElementDescriptor, path: Descriptor[]): void {
    this.elements.add(element);
    let pathToElement: string = null;
    for (const descriptor of path) {
      if (descriptor instanceof DocumentDescriptor) {
        pathToElement = descriptor.document.url;
      }
    }
    if (!pathToElement) {
      throw new Error(`Unable to determine path to element: ${element}`);
    }
    if (this.elementPaths.has(element) &&
        this.elementPaths.get(element) !== pathToElement) {
      throw new Error(
          `Found element ${element} at distinct paths: ` +
          `${pathToElement} and ${this.elementPaths.get(element)}`);
    }
    this.elementPaths.set(element, pathToElement);
  }
}

class AnalysisWalker {
  analysis: Analysis;
  private path: Descriptor[] = [];
  constructor(analysis: Analysis) {
    this.analysis = analysis;
  }
  walk(visitors: AnalysisVisitor[]) {
    this.path.length = 0;
    for (const descriptor of this.analysis.descriptors_) {
      this._walkDocumentDescriptor(descriptor, visitors);
    }
  }

  private _walkDocumentDescriptor(
      dd: DocumentDescriptor, visitors: AnalysisVisitor[]) {
    this.path.push(dd);

    for (const visitor of visitors) {
      if (visitor.visitDocumentDescriptor) {
        visitor.visitDocumentDescriptor(dd, this.path);
      }
    }

    for (const entity of dd.entities) {
      this._walkEntity(entity, visitors);
    }
    for (const dependency of dd.dependencies) {
      this._walkEntity(dependency, visitors);
    }
    this._walkDocument(dd.document, visitors);
    this.path.pop();
  }

  private _walkInlineDocumentDescriptor(
      dd: InlineDocumentDescriptor<any>, visitors: AnalysisVisitor[]) {
    for (const visitor of visitors) {
      if (visitor.visitInlineDocumentDescriptor) {
        visitor.visitInlineDocumentDescriptor(dd, this.path);
      }
    }
  }

  private _walkEntity(entity: Descriptor, visitors: AnalysisVisitor[]) {
    if (entity instanceof DocumentDescriptor) {
      return this._walkDocumentDescriptor(entity, visitors);
    } else if (entity instanceof InlineDocumentDescriptor) {
      return this._walkInlineDocumentDescriptor(entity, visitors);
    } else if (entity['type'] === 'element') {
      return this._walkElement(<ElementDescriptor>entity, visitors);
    }
    throw new Error(`Unknown kind of descriptor: ${entity}`);
  }

  private _walkElement(
      element: ElementDescriptor, visitors: AnalysisVisitor[]) {
    for (const visitor of visitors) {
      if (visitor.visitElement) {
        visitor.visitElement(element, this.path);
      }
    }
  }

  private _walkDocument(
      document: Document<any, any>, visitors: AnalysisVisitor[]) {
    for (const visitor of visitors) {
      if (visitor.visitDocument) {
        visitor.visitDocument(document, this.path);
      }
    }
  }
}