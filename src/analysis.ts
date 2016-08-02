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
import {AnalyzedPackage, Attribute, Element, Event, Property} from './serialized-analysis';

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
  descriptors: DocumentDescriptor[];

  constructor(descriptors: DocumentDescriptor[]) {
    this.descriptors = descriptors;
  }

  /**
   * Throws if the given object isn't a valid AnalyzedPackage according to
   * the JSON schema.
   */
  static validate(analyzedPackage: AnalyzedPackage) {
    const result = validator.validate(analyzedPackage, schema);
    if (result.throwError) {
      throw result.throwError;
    }
    if (result.errors.length > 0) {
      throw new ValidationError(result);
    }
    if (!/^1\.\d+\.\d+$/.test(analyzedPackage.schema_version)) {
      throw new Error(
          `Invalid schema_version in AnalyzedPackage. ` +
          `Expected 1.x.x, got ${analyzedPackage.schema_version}`);
    }
  }
}

export function generateElementMetadata(
    analysis: Analysis, packagePath?: string): AnalyzedPackage {
  const packageGatherer = new PackageGatherer();
  const elementsGatherer = new ElementGatherer();
  new AnalysisWalker(analysis.descriptors).walk([
    packageGatherer, elementsGatherer
  ]);

  const packagesByDir: Map<string, AnalyzedPackage> =
      packageGatherer.packagesByDir;
  const elements = elementsGatherer.elements;
  const elementsByPackageDir = new Map<string, Element[]>();

  for (const element of elementsGatherer.elements) {
    const matchingPackageDirs =
        <string[]>Array.from(packagesByDir.keys())
            .filter(dir => trimLeft(element.path, '/').startsWith(dir));
    const longestMatchingPackageDir =
        matchingPackageDirs.sort((a, b) => b.length - a.length)[0] || '';

    if (longestMatchingPackageDir === '' && !packagesByDir.has('')) {
      packagesByDir.set('', {schema_version: '1.0.0', elements: []});
    }
    packagesByDir.get(longestMatchingPackageDir)!.elements.push(element);
    // We want element paths to be relative to the package directory.
    element.path = trimLeft(
        trimLeft(element.path, '/').substring(longestMatchingPackageDir.length),
        '/');
  }

  return packagesByDir.get(packagePath);
}

function serializeElementDescriptor(
    elementDescriptor: ElementDescriptor, path: string): Element|null {
  const propChangeEvents: Event[] =
      (elementDescriptor.properties || [])
          .filter(p => p.notify)
          .map(p => ({
                 name: `${camelCaseToWordsWithHyphens(p.name)}-changed`,
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
      selectors: [],
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
    const attribute: Attribute = {
      name: camelCaseToWordsWithHyphens(prop.name),
      description: prop.desc || ''
    };
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
  packagesByDir = new Map<string, AnalyzedPackage>();
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
        this.packagesByDir.set(
            trimLeft(dirname, '/'), {schema_version: '1.0.0', elements: []});
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
  private descriptors: DocumentDescriptor[];
  private path: Descriptor[] = [];
  constructor(descriptors: DocumentDescriptor[]) {
    this.descriptors = descriptors;
  }
  walk(visitors: AnalysisVisitor[]) {
    this.path.length = 0;
    for (const descriptor of this.descriptors) {
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

function camelCaseToWordsWithHyphens(camelCased: string): string {
  return camelCased
      .replace(
          /(.)([A-Z])/g,
          (_: string, c1: string, c2: string) => `${c1}-${c2.toLowerCase()}`)
      .toLowerCase();
}

function trimLeft(str: string, char: string): string {
  while (str[0] === char) {
    str = str.substring(1);
  }
  return str;
}