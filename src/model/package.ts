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
import {Warning} from '../warning/warning';

import {Document, FeatureKinds} from './document';
import {Feature} from './feature';
import {Queryable} from './queryable';

export type QueryOptions = object & {
  /**
   * If true then results will include features from outside the package, e.g.
   * from files in bower_components or node_modules directories.
   *
   * Note that even with this option you'll only get results from external files
   * that are referenced from within the package.
   */
  externalPackages?: boolean;
};

// A regexp that matches paths to external code.
// TODO(rictic): Make this extensible (polymer.json?).
const MATCHES_EXTERNAL = /(^|\/)(bower_components|node_modules)/;

/**
 * Represents a queryable interface over all documents in a package/project.
 *
 * Results of queries will include results from all documents in the package, as
 * well as from external dependencies that are transitively imported by
 * documents in the package.
 */
export class Package implements Queryable {
  private _documents: Set<Document>;
  private _toplevelWarnings: Warning[];

  static isExternal(path: string) {
    return MATCHES_EXTERNAL.test(path);
  }

  constructor(documents: Iterable<Document>, warnings: Warning[]) {
    const potentialRoots = new Set(documents);
    this._toplevelWarnings = warnings;

    // We trim down the set of documents as a performance optimization. We only
    // need a set of documents such that all other documents we're interested in
    // can be reached from them. That way we'll do less duplicate work when we
    // query over all documents.
    for (const doc of potentialRoots) {
      for (const imprt of doc.getByKind('import', {imported: true})) {
        // When there's cycles we can keep any element of the cycle, so why not
        // this one.
        if (imprt.document !== doc) {
          potentialRoots.delete(imprt.document);
        }
      }
    }
    this._documents = potentialRoots;
  }

  getByKind<K extends keyof FeatureKinds>(kind: K, options?: QueryOptions):
      Set<FeatureKinds[K]>;
  getByKind(kind: string, options?: QueryOptions): Set<Feature>;
  getByKind(kind: string, options?: QueryOptions): Set<Feature> {
    const result = new Set();
    const docQueryOptions = {imported: true};
    for (const doc of this._documents) {
      addAll(result, doc.getByKind(kind, docQueryOptions));
    }
    return this._filter(result, options || {});
  }

  getById<K extends keyof FeatureKinds>(
      kind: K, identifier: string,
      options?: QueryOptions): Set<FeatureKinds[K]>;
  getById(kind: string, identifier: string, options?: QueryOptions):
      Set<Feature>;
  getById(kind: string, identifier: string, options?: QueryOptions):
      Set<Feature> {
    const result = new Set();
    const docQueryOptions = {imported: true};
    for (const doc of this._documents) {
      addAll(result, doc.getById(kind, identifier, docQueryOptions));
    }
    return this._filter(result, options || {});
  }

  getOnlyAtId<K extends keyof FeatureKinds>(
      kind: K, identifier: string,
      options?: QueryOptions): FeatureKinds[K]|undefined;
  getOnlyAtId(kind: string, identifier: string, options?: QueryOptions): Feature
      |undefined;
  getOnlyAtId(kind: string, identifier: string, options?: QueryOptions): Feature
      |undefined {
    const results = this.getById(kind, identifier);
    if (results.size > 1) {
      throw new Error(
          `Expected to find at most one ${kind} with id ${identifier} ` +
          `but found ${results.size}.`);
    };
    return this._filter(results, options || {}).values().next().value ||
        undefined;
  }

  /**
   * Get all features for all documents in the project or their imports.
   */
  getFeatures(options?: QueryOptions): Set<Feature> {
    const result = new Set();
    const docQueryOptions = {imported: true};
    for (const doc of this._documents) {
      addAll(result, doc.getFeatures(docQueryOptions));
    }
    return this._filter(result, options || {});
  }

  /**
   * Get all warnings in the project.
   */
  getWarnings(options?: QueryOptions): Warning[] {
    const result = new Set(this._toplevelWarnings);
    const docQueryOptions = {imported: true};
    for (const doc of this._documents) {
      addAll(result, new Set(doc.getWarnings(docQueryOptions)));
    }

    return Array.from(this._filter(result, options || {}));
  }

  private _filter<FW extends Feature|Warning>(
      features: Iterable<FW>, options: QueryOptions): Set<FW> {
    if (options.externalPackages) {
      return new Set(features);
    }
    const results = new Set();
    for (const feature of features) {
      if (!feature.sourceRange) {
        // Include features without source ranges indiscriminately.
        results.add(feature);
      } else {
        if (!Package.isExternal(feature.sourceRange.file)) {
          results.add(feature);
        }
      }
    }
    return results;
  }
}

function addAll<T>(set1: Set<T>, set2: Set<T>): Set<T> {
  for (const val of set2) {
    set1.add(val);
  }
  return set1;
}
