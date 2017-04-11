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

import * as estree from 'estree';

import {ElementMixin} from '../index';
import * as jsdocLib from '../javascript/jsdoc';
import {Document, Feature, Method, Privacy, Property, Reference, Resolvable, ScannedFeature, ScannedMethod, ScannedProperty, ScannedReference, Severity, SourceRange, Warning} from '../model/model';

import {getOrInferPrivacy} from '../polymer/js-utils';

/**
 * Represents a JS class as encountered in source code.
 *
 * We only emit a ScannedClass when there's not a more specific kind of feature.
 * Like, we don't emit a ScannedClass when we encounter an element or a mixin
 * (though in the future those features will likely extend from
 * ScannedClass/Class).
 *
 * TODO(rictic): currently there's a ton of duplicated code across the Class,
 *     Element, Mixin, PolymerElement, and PolymerMixin classes. We should
 *     really unify this stuff to a single representation and set of algorithms.
 */
export class ScannedClass implements ScannedFeature, Resolvable {
  readonly name: string|undefined;
  /** The name of the class in the local scope where it is defined. */
  readonly localName: string|undefined;
  readonly astNode: estree.Node;
  readonly jsdoc: jsdocLib.Annotation;
  readonly description: string;
  readonly summary: string;
  readonly sourceRange: SourceRange;
  readonly properties: ScannedProperty[];
  readonly methods: ScannedMethod[];
  readonly superClass: ScannedReference|undefined;
  readonly mixins: ScannedReference[];
  readonly abstract: boolean;
  readonly privacy: Privacy;
  readonly warnings: Warning[];
  constructor(
      className: string|undefined, localClassName: string|undefined,
      astNode: estree.Node, jsdoc: jsdocLib.Annotation, description: string,
      sourceRange: SourceRange, properties: ScannedProperty[],
      methods: ScannedMethod[], superClass: ScannedReference|undefined,
      mixins: ScannedReference[], privacy: Privacy, warnings: Warning[],
      abstract: boolean) {
    this.name = className;
    this.localName = localClassName;
    this.astNode = astNode;
    this.jsdoc = jsdoc;
    this.description = description;
    this.sourceRange = sourceRange;
    this.properties = properties;
    this.methods = methods;
    this.superClass = superClass;
    this.mixins = mixins;
    this.privacy = privacy;
    this.warnings = warnings;
    this.abstract = abstract;
    const summaryTag = jsdocLib.getTag(jsdoc, 'summary');
    this.summary = (summaryTag && summaryTag.description) || '';
  }

  resolve(document: Document): Feature|undefined {
    return new Class(this, document);
  }
}

declare module '../model/queryable' {
  interface FeatureKindMap {
    'class': Class;
  }
}
export class Class implements Feature {
  readonly kinds = new Set(['class']);
  readonly identifiers = new Set<string>();
  readonly sourceRange: SourceRange;
  readonly astNode: any;
  readonly warnings: Warning[];
  readonly summary: string;
  readonly name: string|undefined;

  /**
   * @deprecated use the `name` field instead.
   */
  get className() {
    return this.name;
  }
  readonly jsdoc: jsdocLib.Annotation;
  readonly description: string;
  readonly properties: Property[] = [];
  readonly methods: Method[] = [];
  readonly superClass: Reference|undefined;
  readonly mixins: Reference[] = [];
  readonly abstract: boolean;
  readonly privacy: Privacy;
  readonly demos: {desc?: string; path: string}[];


  constructor(scannedClass: ScannedClass, document: Document) {
    this.sourceRange = scannedClass.sourceRange;
    this.warnings = scannedClass.warnings.slice();
    if (scannedClass.name) {
      this.identifiers.add(scannedClass.name);
    }
    this.astNode = scannedClass.astNode;
    this.demos = jsdocLib.extractDemos(scannedClass.jsdoc, document.url);

    this.name = scannedClass.name;
    this.jsdoc = scannedClass.jsdoc;
    this.description = scannedClass.description;
    this.summary = scannedClass.summary;
    this.abstract = scannedClass.abstract;
    this.privacy = scannedClass.privacy;

    if (scannedClass.superClass) {
      this.superClass = scannedClass.superClass.resolve(document);
    }
    this.methods.push(...scannedClass.methods);
    this.properties.push(...scannedClass.properties);

    this._applySuperClass(scannedClass, document);
    this._applyMixins(scannedClass, document);

    for (const method of this.methods) {
      // methods are only public by default if they're documented.
      method.privacy = getOrInferPrivacy(method.name, method.jsdoc, true);
    }
  }

  protected _inheritFrom(superClass: Class|ElementMixin) {
    const existingProperties = new Set(this.properties.map((p) => p.name));
    for (const superProperty of superClass.properties) {
      if (existingProperties.has(superProperty.name)) {
        continue;
      }
      const newProperty = Object.assign({}, superProperty, {
        inheritedFrom: superProperty.inheritedFrom || superClass.name
      });
      this.properties.push(newProperty);
    }

    const existingMethods = new Set(this.methods.map((m) => m.name));
    for (const superMethod of superClass.methods) {
      if (existingMethods.has(superMethod.name)) {
        continue;
      }
      const newMethod = Object.assign({}, superMethod, {
        inheritedFrom: superMethod.inheritedFrom || superClass.name
      });
      this.methods.push(newMethod);
    }
  }

  protected _applySuperClass(scannedElement: ScannedClass, document: Document) {
    if (scannedElement.superClass &&
        scannedElement.superClass.identifier !== 'HTMLElement') {
      const superElements = document.getFeatures({
        kind: 'class',
        id: scannedElement.superClass.identifier,
        externalPackages: true,
        imported: true,
      });
      if (superElements.size === 1) {
        const superClass = superElements.values().next().value;
        this._inheritFrom(superClass);
        return superClass;
      } else {
        if (superElements.size === 0) {
          this.warnings.push({
            message: `Unable to resolve superclass ` +
                `${scannedElement.superClass.identifier}`,
            severity: Severity.ERROR,
            code: 'unknown-superclass',
            sourceRange: scannedElement.superClass.sourceRange!,
          });
        } else {
          this.warnings.push({
            message: `Multiple superclasses found for ` +
                `${scannedElement.superClass.identifier}`,
            severity: Severity.ERROR,
            code: 'unknown-superclass',
            sourceRange: scannedElement.superClass.sourceRange!,
          });
        }
      }
    }
    return undefined;
  }

  private _applyMixins(scannedClass: ScannedClass, document: Document) {
    for (const scannedMixinReference of scannedClass.mixins) {
      const mixinReference = scannedMixinReference.resolve(document);
      const mixinId = mixinReference.identifier;
      this.mixins.push(mixinReference);
      // TODO(rictic): should look for kind: 'mixin'
      const mixins = document.getFeatures({
        kind: 'element-mixin',
        id: mixinId,
        externalPackages: true,
        imported: true,
      });
      if (mixins.size === 0) {
        this.warnings.push({
          message: `@mixes reference not found: ${mixinId}.` +
              `Did you import it? Is it annotated with @polymerMixin?`,
          severity: Severity.ERROR,
          code: 'mixes-reference-not-found',
          sourceRange: scannedMixinReference.sourceRange!,
        });
        continue;
      } else if (mixins.size > 1) {
        this.warnings.push({
          message: `@mixes reference, multiple mixins found ${mixinId}`,
          severity: Severity.ERROR,
          code: 'mixes-reference-multiple-found',
          sourceRange: scannedMixinReference.sourceRange!,
        });
        continue;
      }
      const mixin = mixins.values().next().value;
      this._inheritFrom(mixin);
    }
  }

  emitMetadata(): object {
    return {};
  }

  emitPropertyMetadata(_property: Property): object {
    return {};
  }

  emitMethodMetadata(_method: Method): object {
    return {};
  }
}
