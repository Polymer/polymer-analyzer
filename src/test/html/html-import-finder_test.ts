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

'use strict';

import {assert} from 'chai';
import * as fs from 'fs';
import * as parse5 from 'parse5';
import * as path from 'path';

import {HtmlDocument, HtmlVisitor} from '../../html/html-document';
import {HtmlImportFinder} from '../../html/html-import-finder';

suite('HtmlImportFinder', () => {

  suite('findImports()', () => {
    let finder: HtmlImportFinder;

    setup(() => {
      finder = new HtmlImportFinder();
    });

    test('finds HTML Imports', async() => {
      let contents = `<html><head>
          <link rel="import" href="polymer.html">
          <link rel="import" type="css" href="polymer.css">
          <script src="foo.js"></script>
          <link rel="stylesheet" href="foo.css"></link>
        </head></html>`;
      let ast = parse5.parse(contents);
      let document = new HtmlDocument({
        url: 'test.html',
        contents,
        ast,
      });
      let visit = async(visitor: HtmlVisitor) => document.visit([visitor]);

      const entities = await finder.findEntities(document, visit);
      assert.equal(entities.length, 1);
      assert.equal(entities[0].type, 'html-import');
      assert.equal(entities[0].url, 'polymer.html');
    });

  });

});