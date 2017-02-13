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

/// <reference path="../../../node_modules/@types/mocha/index.d.ts" />

import {assert, use} from 'chai';
import * as clone from 'clone';
import * as estree from 'estree';
import * as path from 'path';
import * as shady from 'shady-css-parser';

// import {Analyzer} from '../analyzer';
import {AnalysisContext} from '../../core/analysis-context';
import {ParsedCssDocument} from '../../css/css-document';
import {ParsedHtmlDocument} from '../../html/html-document';
import {HtmlParser} from '../../html/html-parser';
// import {ScriptTagImport} from '../html/html-script-tag';
import {ParsedJavaScriptDocument} from '../../javascript/javascript-document';
import {Document, Element, ScannedImport, ScannedInlineDocument} from '../../model/model';
// import {Document, Import, ScannedImport, ScannedInlineDocument} from '../model/model';
import {FSUrlLoader} from '../../url-loader/fs-url-loader';
// import {UrlLoader} from '../url-loader/url-loader';
// import {UrlResolver} from '../../url-loader/url-resolver';
import {PackageUrlResolver} from '../../url-loader/package-url-resolver';
// import {Deferred} from '../utils';

import { TestUrlLoader } from '../test-utils';

import chaiAsPromised = require('chai-as-promised');
import stripIndent = require('strip-indent');

use(chaiAsPromised);

// class TestUrlResolver implements UrlResolver {
//   canResolve(url: string) {
//     return (url === 'test.com/test.html');
//   }

//   resolve(url: string) {
//     return (url === 'test.com/test.html') ? '/static/html-parse-target.html' :
//                                             url;
//   }
// }

suite('AnalysisContext', () => {
  let analysisContext: AnalysisContext;

  setup(() => {
    analysisContext = new AnalysisContext({
      urlLoader: new FSUrlLoader(path.resolve(__dirname, '..')),
      urlResolver: new PackageUrlResolver(),
    });
  });

    // TODO: reconsider whether we should test these private methods.
  suite('_parse()', () => {

    test('loads and parses an HTML document', async() => {
      const doc =
          await analysisContext['_parse']('static/html-parse-target.html');
      assert.instanceOf(doc, ParsedHtmlDocument);
      assert.equal(doc.url, 'static/html-parse-target.html');
    });

    test('loads and parses a JavaScript document', async() => {
      const doc = await analysisContext['_parse']('static/js-elements.js');
      assert.instanceOf(doc, ParsedJavaScriptDocument);
      assert.equal(doc.url, 'static/js-elements.js');
    });

    test('returns a Promise that rejects for non-existant files', async() => {
      await assert.isRejected(analysisContext['_parse']('static/not-found'));
    });
  });

  suite('analyze()', () => {

    test('creates a new context', async () => {
      const newContext = await analysisContext.analyze(['static/analysis/simple/simple-element.html']);
      assert.instanceOf(newContext, AnalysisContext);
      assert.notEqual(analysisContext, newContext);
    });
    
    test.only('document with an inline Polymer element feature', async () => {
      const newContext = await analysisContext.analyze(['static/analysis/simple/simple-element.html']);
      const documentOrWarning = newContext.getDocument('static/analysis/simple/simple-element.html');
      assert.instanceOf(documentOrWarning, Document);
      const document = documentOrWarning as Document;
      const elements = Array.from(document.getByKind('element'));
      assert.deepEqual(elements.map((e: Element) => e.tagName), ['simple-element']);
    });
    
  });

  suite('_getScannedFeatures()', () => {
    test('default import scanners', async() => {
      const contents = `<html><head>
          <link rel="import" href="polymer.html">
          <script src="foo.js"></script>
          <link rel="stylesheet" href="foo.css"></link>
        </head></html>`;
      const document = new HtmlParser().parse(contents, 'test.html');
      const features = <ScannedImport[]>(
          await analysisContext._getPrescannedFeatures(document));
      assert.deepEqual(
          features.map(e => e.type),
          ['html-import', 'html-script', 'html-style']);
      assert.deepEqual(
          features.map(e => e.url),  //
          ['polymer.html', 'foo.js', 'foo.css']);
    });

    test('polymer css import scanner', async() => {
      const contents = `<html><head>
          <link rel="import" type="css" href="foo.css">
        </head>
        <body>
          <dom-module>
            <link rel="import" type="css" href="bar.css">
          </dom-module>
        </body></html>`;
      const document = new HtmlParser().parse(contents, 'test.html');
      const features = (await analysisContext._getPrescannedFeatures(document) as ScannedImport[])
              .filter(e => e instanceof ScannedImport);
      assert.equal(features.length, 1);
      assert.equal(features[0].type, 'css-import');
      assert.equal(features[0].url, 'bar.css');
    });

    test('HTML inline document scanners', async() => {
      const contents = `<html><head>
          <script>console.log('hi')</script>
          <style>body { color: red; }</style>
        </head></html>`;
      const document = new HtmlParser().parse(contents, 'test.html');
      const features = <ScannedInlineDocument[]>(
          await analysisContext._getPrescannedFeatures(document));

      assert.equal(features.length, 2);
      assert.instanceOf(features[0], ScannedInlineDocument);
      assert.instanceOf(features[1], ScannedInlineDocument);
    });

    const testName =
        'HTML inline documents can be cloned, modified, and stringified';
    test(testName, async () => {
      const url = 'test-doc.html';
      const contents = stripIndent(`
        <div>
          <script>
            console.log('foo');
          </script>
          <style>
            body {
              color: blue;
            }
          </style>
        </div>
      `).trim();

      const analysisContext = new AnalysisContext({
        urlLoader: new TestUrlLoader({
          [url]: contents,
        }),
        urlResolver: new PackageUrlResolver(),
      });

      const expectedContents = stripIndent(`
        <div>
          <script>
            console.log('bar');
          </script>
          <style>
            body {
              color: red;
            }
          </style>
        </div>
      `).trim();
      const newContext = await analysisContext.analyze([url]);
      const origDocumentOrWarning = newContext.getDocument(url);
      if (!(origDocumentOrWarning instanceof Document)) {
        console.warn('not found?', url, origDocumentOrWarning);
        assert.fail(origDocumentOrWarning);
      }
      const origDocument = origDocumentOrWarning as Document;
      const document = clone(origDocument);

      // In document, we'll change `foo` to `bar` in the js and `blue` to
      // `red` in the css.
      const jsDocs = document.getByKind('js-document') as Set<Document>;
      assert.equal(1, jsDocs.size);
      const jsDoc = jsDocs.values().next().value;
      (jsDoc.parsedDocument as ParsedJavaScriptDocument).visit([{
        enterCallExpression(node: estree.CallExpression) {
          node.arguments =
              [{type: 'Literal', value: 'bar', raw: 'bar'}] as estree.Literal[];
        }
      }]);

      const cssDocs = document.getByKind('css-document') as Set<Document>;
      assert.equal(1, cssDocs.size);
      const cssDoc = cssDocs.values().next().value;
      (cssDoc.parsedDocument as ParsedCssDocument).visit([{
        visit(node: shady.Node) {
          if (node.type === 'expression' && node.text === 'blue') {
            node.text = 'red';
          }
        }
      }]);

      // We can stringify the clone and get the modified contents, and
      // stringify the original and still get the original contents.
      assert.deepEqual(document.stringify(), expectedContents);
      assert.deepEqual(origDocument.stringify(), contents);
    });

  });

});