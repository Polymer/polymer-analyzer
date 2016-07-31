/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
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

import * as fs from 'fs';
import * as jsonschema from 'jsonschema';
import * as path from 'path';

import {Descriptor, DocumentDescriptor, ElementDescriptor, InlineDocumentDescriptor, PropertyDescriptor} from './ast/ast';
import {JsonDocument} from './json/json-document';
import {Document} from './parser/document';
import {Attribute, Element, Event, Package, Property, SerializedAnalysis} from './serialized-analysis';

const validator = new jsonschema.Validator();
const schema = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'analysis.schema.json'), 'utf-8'));

export class ValidationError extends Error {
  errors: jsonschema.ValidationError[];
  constructor(result: jsonschema.ValidationResult) {
    const message = `Unable to validate serialized Polymer analysis. ` +
        `Got ${result.errors.length} errors: ` +
        `${result.errors.map(err => '    ' + (err.message || err)).join('\n')}`;
    super(message);
    this.errors = result.errors;
  }
}

export class Analysis {
  _descriptors: DocumentDescriptor[];

  constructor(descriptors: DocumentDescriptor[]) {
    this._descriptors = descriptors;
  }

  /**
   * Throws if the given object isn't a valid SerializedAnalysis according to
   * the JSON schema.
   */
  static validate(serializedAnalysis: SerializedAnalysis) {
    const result = validator.validate(serializedAnalysis, schema);
    if (result.throwError) {
      throw result.throwError;
    }
    if (result.errors.length > 0) {
      throw new ValidationError(result);
    }
  }

  serialize(): SerializedAnalysis {
    const packageGatherer = new PackageGatherer();
    const elementsGatherer = new ElementGatherer();
    const walker =
        new AnalysisWalker(this).walk([packageGatherer, elementsGatherer]);

    const packagesByDir: Map<string|null, Package> =
        packageGatherer.packagesByDir;
    const elements = elementsGatherer.elements;
    const elementsByPackageDir = new Map<string, Element[]>();

    for (const element of elementsGatherer.elements) {
      const longestMatchingPackageDir =
          (<string[]>Array.from(packagesByDir.keys())
               .filter(dir => dir && element.path.startsWith(dir)))
              .sort((a, b) => b.length - a.length)[0];
      if (!longestMatchingPackageDir) {
        let pckg = packagesByDir.get(null) || {elements: []};
        pckg.elements.push(element);
        packagesByDir.set(null, pckg);
      } else {
        packagesByDir.get(longestMatchingPackageDir)!.elements.push(element);
        let prefixLength = longestMatchingPackageDir.length;
        if (!longestMatchingPackageDir.endsWith('/')) {
          prefixLength += 1;
        }
        // We want element paths to be relative to the package directory.
        element.path = element.path.substring(prefixLength);
      }
    }

    return {packages: Array.from(packagesByDir.values())};
  }
}

function serializeElementDescriptor(
    elementDescriptor: ElementDescriptor, path: string): Element|null {
  const propChangeEvents: Event[] =
      (elementDescriptor.properties || [])
          .filter(p => p.notify)
          .map(p => ({
                 name: `${p.name}-changed`,
                 type: 'CustomEvent',
                 description: `Fired when the \`${p.name}\` property changes.`
               }));

  if (!elementDescriptor.is) {
    return null;
  }
  const properties = elementDescriptor.properties || [];
  return {
    tagname: elementDescriptor.is,
    description: '',
    superclass: 'HTMLElement',
    path: path,
    attributes: computeAttributesFromPropertyDescriptors(properties),
    properties: properties.map(serializePropertyDescriptor),
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

function computeAttributesFromPropertyDescriptors(props: PropertyDescriptor[]):
    Attribute[] {
  return props.map(prop => {
    const attribute:
        Attribute = {name: prop.name, description: prop.desc || ''};
    if (prop.type) {
      attribute.type = prop.type;
    }
    if (prop.default) {
      attribute.type = prop.type;
    }
    return attribute;
  });
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
      const pckg = <Package>this.packagesByDir.get(dirname);
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
    let pathToElement: string|null = null;
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
      const elem = serializeElementDescriptor(element, pathToElement);
      if (elem) {
        this.elements.push(elem);
      }
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
    for (const descriptor of this.analysis._descriptors) {
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
