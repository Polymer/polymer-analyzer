/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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

import {assert} from 'chai';

import {ScannedDocument, ScannedFeature, ScannedInlineDocument} from '../../model/model';
import {ParsedDocument} from '../../parser/document';

suite('ScannedDocument', () => {

  suite('getNestedFeatures()', () => {

    test('gets local features', () => {
      const features: ScannedFeature[] = [
        makeFeature(1),
        makeFeature(2),
        makeFeature(3),
      ];
      const parsedDocument = new TestParsedDocument();
      const scannedDocument = new ScannedDocument(parsedDocument, features);
      const allFeatures = scannedDocument.getNestedFeatures();
      assert.sameMembers(features, Array.from(allFeatures));
    });

    test('gets nested features', () => {
      const nestedFeatures: ScannedFeature[] = [
        makeFeature(1),
        makeFeature(2),
        makeFeature(3),
      ];
      const nestedParsedDocument = new TestParsedDocument();
      const nestedScannedDocument =
          new ScannedDocument(nestedParsedDocument, nestedFeatures);
      const nestedInlineDocument = new ScannedInlineDocument(
          'test-document', '', {line: 0, col: 0}, '', null as any, null as any);
      nestedInlineDocument.scannedDocument = nestedScannedDocument;
      const localFeatures: ScannedFeature[] = [
        makeFeature(4),
        nestedInlineDocument,
      ];
      const localParsedDocument = new TestParsedDocument();
      const localScannedDocument =
          new ScannedDocument(localParsedDocument, localFeatures);

      const allFeatures = localScannedDocument.getNestedFeatures();
      const expectedFeatures = allFeatures.concat(localFeatures);
      assert.sameMembers(expectedFeatures, Array.from(allFeatures));
    });

    test('gets wrapped features', () => {
      const wrappedFeatures: ScannedFeature[] = [
        makeFeature(1),
        makeFeature(2),
        makeFeature(3),
      ];
      const parsedDocument = new TestParsedDocument();
      const wrappedScannedDocument =
          new ScannedDocument(parsedDocument, wrappedFeatures);

      const localFeatures: ScannedFeature[] = [
        makeFeature(4),
        makeFeature(5),
      ];
      const localScannedDocument =
          new ScannedDocument(wrappedScannedDocument, localFeatures);

      const allFeatures = localScannedDocument.getNestedFeatures();
      const expectedFeatures = allFeatures.concat(localFeatures);
      assert.sameMembers(expectedFeatures, Array.from(allFeatures));
    });

  });

});

class TestParsedDocument extends ParsedDocument<any, any> {
  type: 'test-document';

  constructor() {
    super({
      url: '',
      contents: '',
      ast: null,
      locationOffset: undefined,
      astNode: null,
      isInline: false,
    });
  }

  visit(_visitors: any): void {
    throw new Error('unsupported');
  }


  forEachNode(_callback: any): void {
    throw new Error('unsupported');
  }

  _sourceRangeForNode(_node: any): undefined {
    throw new Error('unsupported');
  }

  stringify(_options: any): string {
    throw new Error('unsupported');
  }
}

function makeFeature(id: number) {
  return {
    astNode: id, sourceRange: undefined, warnings: [],
  }
}
