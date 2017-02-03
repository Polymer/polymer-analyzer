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

import {ParsedDocument} from '../parser/document';
import {Warning} from '../warning/warning';

import {ScannedFeature} from './feature';
import {SourceRange} from './source-range';

/**
 * The metadata for all features and elements defined in one document
 */
export class ScannedDocument {
  _parsedDocument?: ParsedDocument<any, any>;
  _scannedDocument?: ScannedDocument;
  _features: ScannedFeature[];
  isInline = false;
  sourceRange: SourceRange|undefined = undefined;  // TODO(rictic): track this
  warnings: Warning[];

  constructor(
      document: ParsedDocument<any, any>|ScannedDocument,
      features: ScannedFeature[], warnings?: Warning[]) {
    if (document instanceof ScannedDocument) {
      this._scannedDocument = document;
    } else {
      this._parsedDocument = document;
    }
    this._features = features;
    this.warnings = warnings || [];
    this.isInline = document.isInline;
  }

  get features(): ScannedFeature[] {
    let features: ScannedFeature[] = [];
    if (this._scannedDocument) {
      features = features.concat(this._scannedDocument.features);
    }
    features = features.concat(this._features);
    return features;
  }

  get parsedDocument() {
    return (this._scannedDocument || this)._parsedDocument!;
  }

  get url() {
    return this.parsedDocument.url;
  }

  /**
   * Gets all features in this scanned document and all inline documents it
   * contains.
   */
  getNestedFeatures(): ScannedFeature[] {
    const result: ScannedFeature[] = [];
    this._getNestedFeatures(result);
    return result;
  }

  private _getNestedFeatures(features: ScannedFeature[]): void {
    // if (this._scannedDocument) {
    //   this._scannedDocument._getNestedFeatures(features);
    // }
    for (const feature of this.features) {
      // Ad hoc test needed here to avoid a problematic import loop.
      if (feature.constructor.name === 'ScannedDocument' &&
          feature['scannedDocument']) {
        const innerDoc = feature['scannedDocument'] as ScannedDocument;
        innerDoc._getNestedFeatures(features);
      } else {
        features.push(feature);
      }
    }
  }
}
