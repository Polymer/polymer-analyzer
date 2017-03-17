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
import {assert} from 'chai';
import {SourceRange} from '../../model/model';
import {ParsedDocument, StringifyOptions} from '../../parser/document';

class TestDocument extends ParsedDocument<null, null> {
  type: string;
  visit(_visitors: null[]): void {
    throw new Error('Method not implemented.');
  }
  forEachNode(_callback: (node: null) => void): void {
    throw new Error('Method not implemented.');
  }
  protected _sourceRangeForNode(_node: null): SourceRange|undefined {
    throw new Error('Method not implemented.');
  }
  stringify(_options: StringifyOptions): string {
    throw new Error('Method not implemented.');
  }
}

suite('ParsedDocument', () => {

  /**
   * We have pretty great tests of offsetsToSourceRange just because it's used
   * so much in ParsedHtmlDocument, which has tons of tests. So we can get good
   * tests of sourceRangeToOffsets by ensuring that they're inverses of one
   * another.
   */
  const testName =
      'offsetsToSourceRange is the inverse of sourceRangeToOffsets';
  test(testName, async() => {
    const contents = [``, `asdf`, `a\na`, `asdf\n\nasdf`, `\nasdf\n`];
    for (const content of contents) {
      const document = new TestDocument({
        ast: null,
        astNode: null,
        baseUrl: 'test-document',
        contents: content,
        isInline: false,
        locationOffset: undefined,
        url: 'test-document'
      });
      for (let start = 0; start < contents.length; start++) {
        for (let end = start; end < contents.length; end++) {
          const range = document.offsetsToSourceRange(start, end);
          const offsets = document.sourceRangeToOffsets(range);
          assert.deepEqual(offsets, [start, end]);
        }
      }
    }
  });
});
