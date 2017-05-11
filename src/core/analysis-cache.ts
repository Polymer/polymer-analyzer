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

import {SetOnlyMap} from '../model/immutable';
import {Document, ScannedDocument, Warning} from '../model/model';
import {ParsedDocument} from '../parser/document';

import {AsyncWorkCache} from './async-work-cache';
import {DependencyGraph} from './dependency-graph';

export class AnalysisCache {
  /**
   * These are maps from resolved URLs to Promises of various stages of the
   * analysis pipeline.
   */
  readonly parsedDocumentPromises:
      AsyncWorkCache<string, ParsedDocument<any, any>>;
  readonly scannedDocumentPromises: AsyncWorkCache<string, ScannedDocument>;

  /**
   * An entry is in this cache when all the path and all its dependencies have
   * been scanned.
   */
  readonly dependenciesScannedPromises: AsyncWorkCache<string, ScannedDocument>;
  readonly analyzedDocumentPromises: AsyncWorkCache<string, Document>;

  /**
   * TODO(rictic): These synchronous caches need to be kept in sync with their
   *     async work cache analogues above.
   */
  readonly scannedDocuments: SetOnlyMap<string, ScannedDocument>;
  readonly analyzedDocuments: SetOnlyMap<string, Document>;
  readonly failedDocuments: Map<string, Warning>;

  readonly dependencyGraph: DependencyGraph;

  /**
   * @param from Another AnalysisCache to copy the caches from. The new
   *   AnalysisCache will have an independent copy of everything but from's
   *   dependency graph, which is passed in separately.
   * @param newDependencyGraph If given, use this dependency graph. We pass
   *   this in like this purely as an optimization. See `invalidatePaths`.
   */
  constructor(from?: Options) {
    const f: Partial<Options> = from || {};
    this.parsedDocumentPromises = new AsyncWorkCache(f.parsedDocumentPromises);
    this.scannedDocumentPromises =
        new AsyncWorkCache(f.scannedDocumentPromises);
    this.analyzedDocumentPromises =
        new AsyncWorkCache(f.analyzedDocumentPromises);
    this.dependenciesScannedPromises =
        new AsyncWorkCache(f.dependenciesScannedPromises);

    this.failedDocuments = new Map(f.failedDocuments!);
    this.scannedDocuments = new Map(f.scannedDocuments!);
    this.analyzedDocuments = new Map(f.analyzedDocuments!);
    this.dependencyGraph = f.dependencyGraph || new DependencyGraph();
  }

  /**
   * Returns a copy of this cache, with the given document and all of its
   * transitive dependants invalidated.
   *
   * Must be called whenever a document changes.
   */
  invalidate(documentPaths: string[]): AnalysisCache {
    // TODO(rictic): how much of this work can we short circuit in the case
    //     none of these paths are in any of the caches? e.g. when someone calls
    //     filesChanged() for the same files twice without ever calling analyze?
    //     Could end up saving some work in the editor case.
    //     On the other hand, copying a half dozen maps with maybe 200 entries
    //     each should be pretty cheap, maybe not worth the effort.

    const pathSet = new Set(documentPaths);

    const parsedDocumentPromises =
        new Map(filterOutByKey(this.parsedDocumentPromises, pathSet));
    const scannedDocumentPromises =
        new Map(filterOutByKey(this.scannedDocumentPromises, pathSet));
    const dependenciesScannedPromises =
        new Map(filterOutByKey(this.dependenciesScannedPromises, pathSet));

    const scannedDocuments =
        new Map(filterOutByKey(this.scannedDocuments, pathSet));
    const analyzedDocuments =
        new Map(filterOutByKey(this.analyzedDocuments, pathSet));
    const failedDocuments =
        new Map(filterOutByKey(this.failedDocuments, pathSet));

    for (const path of documentPaths) {
      // Note that we must calculate dependants using the pre-fork dependency
      // graph.
      const dependants = this.dependencyGraph.getAllDependantsOf(path);

      // Analyzed documents need to be treated more carefully, because they have
      // relationships with other documents. So first we remove all documents
      // which transitively import the changed document. We also need to mark
      // all of those docs as needing to rescan their dependencies.
      for (const partiallyInvalidatedPath of dependants) {
        dependenciesScannedPromises.delete(partiallyInvalidatedPath);
        analyzedDocuments.delete(partiallyInvalidatedPath);
      }
    }

    // The cache of promises of analyzed documents shouldn't be forked, as it
    // could have in-progress results that don't cohere with the state of the
    // new cache. Only populate the new analyzed promise cache with results
    // that are definite, and not invalidated.
    const analyzedDocumentPromises = new Map<string, Promise<Document>>();
    for (const [path, document] of analyzedDocuments) {
      analyzedDocumentPromises.set(path, Promise.resolve(document));
    }

    return new AnalysisCache({
      parsedDocumentPromises,
      scannedDocumentPromises,
      dependenciesScannedPromises,
      scannedDocuments,
      analyzedDocuments,
      failedDocuments,
      analyzedDocumentPromises,
      dependencyGraph: this.dependencyGraph.invalidatePaths(documentPaths),
    });
  }

  toString() {
    return `<AnalysisCache
        scannedDocuments:
            ${Array.from(this.scannedDocuments.keys()).join('\n            ')}
        analyzedDocuments:
            ${Array.from(this.analyzedDocuments.keys()).join('\n            ')}
      >`;
  }
}

function* filterOutByKey<K, V>(entries: Iterable<[K, V]>, filterOut: Set<K>) {
  for (const keyValue of entries) {
    if (!filterOut.has(keyValue[0])) {
      yield keyValue;
    }
  }
}

export interface Options {
  parsedDocumentPromises: Map<string, Promise<ParsedDocument<any, any>>>;
  scannedDocumentPromises: Map<string, Promise<ScannedDocument>>;
  dependenciesScannedPromises: Map<string, Promise<ScannedDocument>>;
  analyzedDocumentPromises: Map<string, Promise<Document>>;
  scannedDocuments: Map<string, ScannedDocument>;
  analyzedDocuments: Map<string, Document>;
  failedDocuments: Map<string, Warning>;
  dependencyGraph: DependencyGraph;
}
