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

import {Analyzer} from '../../core/analyzer';
import {PackageRelativeUrl} from '../../index';
import {InMemoryOverlayUrlLoader} from '../../url-loader/overlay-loader';
import {PackageUrlResolver} from '../../url-loader/package-url-resolver';

suite('HtmlTemplateLiteralScanner', () => {
  async function analyzeContents(fileName: string, contents: string) {
    const urlResolver = new PackageUrlResolver();
    const urlLoader = new InMemoryOverlayUrlLoader();
    const url = urlResolver.resolve(fileName as PackageRelativeUrl)!;
    urlLoader.urlContentsMap.set(url, contents);
    const analyzer = new Analyzer({urlResolver, urlLoader});
    const analysis = await analyzer.analyze([url]);
    const result = analysis.getDocument(url);
    if (!result.successful) {
      throw new Error(`Tried to get document for url but failed: ${url}`);
    }
    return {document: result.value, url};
  }

  test('works in a super simple case', async () => {
    const {document, url} = await analyzeContents('index.js', `
      html\`<div>Hello world</div>\`
    `);
    const documents = document.getFeatures({kind: 'document'});
    assert.deepEqual(
        [...documents].map((d) => [d.url, d.type, d.isInline]),
        [[url, 'js', false], [url, 'html', true]]);
    const [htmlDocument] = document.getFeatures({kind: 'html-document'});
    assert.deepEqual(
        htmlDocument.parsedDocument.contents, `<div>Hello world</div>`);
  });
});
