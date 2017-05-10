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

import {Visitor} from '../../javascript/estree-visitor';
import {JavaScriptParser} from '../../javascript/javascript-parser';
import {JavaScriptPolymerLintDirectiveScanner} from '../../javascript/polymer-lint-directive-scanner';
import {ScannedPolymerLintDirective} from '../../model/model';
import {FSUrlLoader} from '../../url-loader/fs-url-loader';
import {CodeUnderliner} from '../test-utils';

suite('JavaScriptImportScanner', () => {

  const testFilesDir = path.resolve(__dirname, '../static/directives/');
  const urlLoader = new FSUrlLoader(testFilesDir);
  const underliner = new CodeUnderliner(urlLoader);
  const parser = new JavaScriptParser();
  const scanner = new JavaScriptPolymerLintDirectiveScanner();

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
    const file = await urlLoader.load('polymer-lint-directives.js');
    const document = parser.parse(file, 'polymer-lint-directives.js');
    const visit = async(visitor: Visitor) => document.visit([visitor]);
    const {features: directives} = await scanner.scan(document, visit);
    const directiveProperties = await Promise.all(directives.map(getTestProps));

    assert.deepEqual(directiveProperties, [
      {
        identifier: 'polymer-lint',
        args: ['disable'],
        warnings: [],
        codeSnippet: `
/* polymer-lint disable */
~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      },
      {
        identifier: 'polymer-lint',
        args: ['enable'],
        warnings: [],
        codeSnippet: `
/* polymer-lint enable */
~~~~~~~~~~~~~~~~~~~~~~~~~`,
      },
      {
        identifier: 'polymer-lint',
        args: ['disable', 'foobar', 'foobar-rules'],
        warnings: [],
        codeSnippet: `
/* polymer-lint disable: foobar, foobar-rules */
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      },
      {
        identifier: 'polymer-lint',
        args: ['enable', 'foobar', 'foobar-rules'],
        warnings: [],
        codeSnippet: `
/* polymer-lint enable: foobar, foobar-rules */
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      }
    ]);
  });

});
