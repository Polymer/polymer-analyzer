import * as path from 'path';

import {Descriptor, DocumentDescriptor, ElementDescriptor, InlineDocumentDescriptor, PropertyDescriptor} from './ast/ast';
import {JsonDocument} from './json/json-document';
import {Document} from './parser/document';
import {Element, Event, Package, Property, SerializedAnalysis} from './serialized-analysis';

export class Analysis {
  descriptors_: DocumentDescriptor[];
  constructor(descriptors: DocumentDescriptor[]) {
    this.descriptors_ = descriptors;
  }

  serialize(): SerializedAnalysis {
    const packageGatherer = new PackageGatherer();
    const elementsGatherer = new ElementGatherer();
    const walker =
        new AnalysisWalker(this).walk([packageGatherer, elementsGatherer]);

    const packagesByDir = packageGatherer.packagesByDir;
    const elements = elementsGatherer.elements;
    const elementsByPackageDir = new Map<string, Element[]>();

    for (const element of elementsGatherer.elements) {
      const longestMatchingPackageDir =
          Array.from(packagesByDir.keys())
              .filter(dir => element.path.startsWith(dir))
              .sort((a, b) => a.length - b.length)[0];
      if (!longestMatchingPackageDir) {
        if (!packagesByDir.has(null)) {
          packagesByDir.set(null, {elements: []});
        }
        packagesByDir.get(null).elements.push(element);
      } else {
        packagesByDir.get(longestMatchingPackageDir).elements.push(element);
        element.path = element.path.substring(longestMatchingPackageDir.length);
      }
    }

    return {packages: Array.from(packagesByDir.values())};
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

class PackageGatherer implements AnalysisVisitor {
  private packageFiles: JsonDocument[] = [];
  packagesByDir = new Map<string, Package>();
  visitDocument(document: Document<any, any>, path: Descriptor[]): void {
    if (document instanceof JsonDocument &&
        (document.url.endsWith('package.json') ||
         document.url.endsWith('bower.json'))) {
      this.packageFiles.push(document);
    }
  }

  done() {
    for (const packageFile of this.packageFiles) {
      const dirname = path.dirname(packageFile.url);
      if (!this.packagesByDir.has(dirname)) {
        this.packagesByDir.set(dirname, {elements: []});
      }
      const pckg = this.packagesByDir.get(dirname);
      const fileContents: {name: string, version: string} =
          <any>packageFile.ast;

      const strictFields = ['name', 'version'];
      for (const field of strictFields) {
        if (!fileContents[field]) {
          throw new Error(
              `Found bad package metadata at ${packageFile.url}.` +
              ` Missing field \`${field}\``);
        }
        if (pckg[field] && pckg[field] !== fileContents[field]) {
          throw new Error(
              `Conflict in package metadata for directory \`${dirname}\`.` +
              ` ${field} was found to be \`${pckg[field]}\` but ` +
              `${packageFile.url} has the value \`${fileContents[field]}\``);
        }
      }

      pckg.name = fileContents.name;
      pckg.version = fileContents.version;
      if (packageFile.url.endsWith('bower.json')) {
        pckg.bowerMetadata = fileContents;
      } else if (packageFile.url.endsWith('package.json')) {
        pckg.npmPackage = fileContents;
      }
    }
  }
}

class ElementGatherer implements AnalysisVisitor {
  elements: Element[] = [];
  private elementPaths = new Map<ElementDescriptor, string>();
  visitElement(element: ElementDescriptor, path: Descriptor[]): void {
    let pathToElement: string = null;
    for (const descriptor of path) {
      if (descriptor instanceof DocumentDescriptor) {
        pathToElement = descriptor.document.url;
      }
    }
    if (!pathToElement) {
      throw new Error(`Unable to determine path to element: ${element}`);
    }
    if (this.elementPaths.has(element)) {
      if (this.elementPaths.get(element) !== pathToElement) {
        throw new Error(
            `Found element ${element} at distinct paths: ` +
            `${pathToElement} and ${this.elementPaths.get(element)}`);
      }
    } else {
      this.elementPaths.set(element, pathToElement);
      this.elements.push(serializeElementDescriptor(element, pathToElement));
    }
  }
}

abstract class AnalysisVisitor {
  visitDocumentDescriptor?(dd: DocumentDescriptor, path: Descriptor[]): void;
  visitInlineDocumentDescriptor?
      (dd: InlineDocumentDescriptor<any>, path: Descriptor[]): void;
  visitElement?(element: ElementDescriptor, path: Descriptor[]): void;
  visitDocument?(document: Document<any, any>, path: Descriptor[]): void;
  done?(): void;
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
    for (const visitor of visitors) {
      if (visitor.done) {
        visitor.done();
      }
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
