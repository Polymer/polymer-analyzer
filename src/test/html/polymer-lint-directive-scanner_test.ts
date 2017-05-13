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
import * as path from 'path';

import {HtmlVisitor} from '../../html/html-document';
import {HtmlParser} from '../../html/html-parser';
import {HtmlPolymerLintDirectiveScanner} from '../../html/polymer-lint-directive-scanner';
import {ScannedPolymerLintDirective} from '../../model/model';
import {FSUrlLoader} from '../../url-loader/fs-url-loader';
import {CodeUnderliner} from '../test-utils';

suite('HtmlPolymerLintDirectiveScanner', () => {

  const testFilesDir = path.resolve(__dirname, '../static/directives/');
  const urlLoader = new FSUrlLoader(testFilesDir);
  const underliner = new CodeUnderliner(urlLoader);
  const parser = new HtmlParser();
  const scanner = new HtmlPolymerLintDirectiveScanner();

  async function getTestProps(directive: ScannedPolymerLintDirective):
      Promise<any> {
        return {
          identifier: directive.identifier,
          args: directive.args,
          warnings: directive.warnings,
          codeSnippet: await underliner.underline(directive.sourceRange),
        };
      }

  test('finds directives', async() => {
    const file = await urlLoader.load('polymer-lint-directives.html');
    const document = parser.parse(file, 'polymer-lint-directives.html');
    const visit = async(visitor: HtmlVisitor) => document.visit([visitor]);
    const {features: directives} = await scanner.scan(document, visit);
    const directiveProperties = await Promise.all(directives.map(getTestProps));

    assert.deepEqual(directiveProperties, [
      {
        identifier: 'polymer-lint',
        args: ['disable'],
        warnings: [],
        codeSnippet: `
<!-- polymer-lint disable -->
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      },
      {
        identifier: 'polymer-lint',
        args: ['enable'],
        warnings: [],
        codeSnippet: `
<!-- polymer-lint enable -->
~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      },
      {
        identifier: 'polymer-lint',
        args: ['disable', 'foobar', 'foobar-rules'],
        warnings: [],
        codeSnippet: `
<!-- polymer-lint disable: foobar, foobar-rules -->
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      },
      {
        identifier: 'polymer-lint',
        args: ['enable', 'foobar', 'foobar-rules'],
        warnings: [],
        codeSnippet: `
<!-- polymer-lint enable: foobar, foobar-rules -->
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      }
    ]);
  });

});
