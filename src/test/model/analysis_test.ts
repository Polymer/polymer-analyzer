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

/// <reference path="../../../node_modules/@types/mocha/index.d.ts" />

import {assert} from 'chai';
import {Analyzer} from '../../core/analyzer';
import {Document} from '../../model/document';
import {FSUrlLoader} from '../../url-loader/fs-url-loader';

suite('Analysis', () => {

  suite('getDocumentOrDie', () => {

    test('throws exception if asked for unrecognized url', async() => {
      const analyzer =
          new Analyzer({urlLoader: new FSUrlLoader('src/test/static/')});
      const analysis = await analyzer.analyze(['stylesheet.css']);
      assert.throw(() => {
        analysis.getDocumentOrDie('not-a-thing.html');
      });
    });

    test('throws exception if asked for url mapped to a Warning', async() => {
      const analyzer =
          new Analyzer({urlLoader: new FSUrlLoader('src/test/static/')});
      const analysis = await analyzer.analyze(['js-parse-error.js']);
      assert.throw(() => {
        analysis.getDocumentOrDie('js-parse-error.js');
      });
    });

    test('returns Document for url', async() => {
      const analyzer =
          new Analyzer({urlLoader: new FSUrlLoader('src/test/static/')});
      const analysis = await analyzer.analyze(['stylesheet.css']);
      assert.instanceOf(analysis.getDocumentOrDie('stylesheet.css'), Document);
    });
  });
});
