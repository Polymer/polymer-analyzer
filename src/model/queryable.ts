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
import {Function} from '../javascript/function';
import {Namespace} from '../javascript/namespace';
import {Behavior} from '../polymer/behavior';
import {DomModule} from '../polymer/dom-module-scanner';
import {PolymerElement} from '../polymer/polymer-element';
import {PolymerElementMixin} from '../polymer/polymer-element-mixin';

import {Document} from './document';
import {Element} from './element';
import {ElementMixin} from './element-mixin';
import {ElementReference} from './element-reference';
import {Feature} from './feature';
import {Import} from './import';
import {Warning} from './warning';

// A map between kind string literal types and their feature types.
export interface FeatureKindMap {
  'document': Document;
  'element': Element;
  'element-mixin': ElementMixin;
  'polymer-element': PolymerElement;
  'polymer-element-mixin': PolymerElementMixin;
  'behavior': Behavior;
  'namespace': Namespace;
  'function': Function;
  'dom-module': DomModule;
  'element-reference': ElementReference;
  'import': Import;

  // Document specializations.
  'html-document': Document;
  'js-document': Document;
  'json-document': Document;
  'css-document': Document;

  // Import specializations.
  'html-import': Import;
  'html-script': Import;
  'html-style': Import;
  'js-import': Import;
  'css-import': Import;
}
export type FeatureKind = keyof FeatureKindMap;
export interface BaseQueryOptions {
  /**
   * If true then results will include features from outside the package, e.g.
   * from files in bower_components or node_modules directories.
   *
   * Note that even with this option you'll only get results from external files
   * that are referenced from within the package.
   */
  externalPackages?: boolean;

  /**
   * Do not include any features that are only reachable via paths that include
   * lazy import edges.
   */
  noLazyImports?: boolean;

  /**
   * If given, the query results will all have the given identifier.
   *
   * There identifiers mean different things for different kinds of features.
   * For example documents are identified by their url, and elements are
   * identified by their tag and class names.
   */
  id?: string;
}

export type QueryOptions = BaseQueryOptions & object;

export type AnalysisQueryOptions = QueryOptions & {
  imported?: true;
};

export type DocumentQueryOptions = QueryOptions & {
  /**
   * If true, the query will return results from the document and its
   * dependencies. Otherwise it will only include results from the document.
   */
  imported?: boolean;
};


export type BaseQuery = BaseQueryOptions & {kind?: string};
export type BaseQueryWithKind<K extends FeatureKind> =
    BaseQueryOptions & {kind: K};
export type DocumentQuery = DocumentQueryOptions & {kind?: string};
export type DocumentQueryWithKind<K extends FeatureKind> =
    DocumentQueryOptions & {kind: K};
export type AnalysisQuery = AnalysisQueryOptions & {kind?: string};
export type AnalysisQueryWithKind<K extends FeatureKind> =
    AnalysisQueryOptions & {kind: K};


/**
 * Represents something like a Document or an Analysis. A container of features
 * and warnings that's queryable in a few different ways.
 */
export interface Queryable {
  getFeatures<K extends FeatureKind>(query: BaseQueryWithKind<K>):
      Set<FeatureKindMap[K]>;
  getFeatures(query?: BaseQuery): Set<Feature>;

  getWarnings(options?: BaseQuery): Warning[];
}
