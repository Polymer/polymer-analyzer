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
import {ScannedFeature} from '../../model/model';
import {ScannedNamespace} from '../../polymer/namespace';
import {NamespaceScanner} from '../../polymer/namespace-scanner';
import {FSUrlLoader} from '../../url-loader/fs-url-loader';

suite('NamespaceScanner', () => {
  const testFilesDir = path.resolve(__dirname, '../static/namespaces/');
  const urlLoader = new FSUrlLoader(testFilesDir);

  async function getNamespaces(filename: string): Promise<any[]> {
    const file = await urlLoader.load(filename);
    const parser = new JavaScriptParser();
    const document = parser.parse(file, filename);
    const scanner = new NamespaceScanner();
    const visit = (visitor: Visitor) =>
        Promise.resolve(document.visit([visitor]));
    const features: ScannedFeature[] = await scanner.scan(document, visit);
    return <ScannedNamespace[]>features.filter(
        (e) => e instanceof ScannedNamespace);
  };

  test('scans named namespaces', async() => {
    const namespaces = await getNamespaces('namespace-named.js');
    assert.equal(namespaces.length, 2);

    assert.equal(namespaces[0].name, 'ExplicitlyNamedNamespace');
    assert.equal(namespaces[0].description, '\n');
    assert.deepEqual(namespaces[0].warnings, []);
    assert.deepEqual(namespaces[0].sourceRange, {
      file: 'namespace-named.js',
      start: {line: 3, column: 0},
      end: {line: 3, column: 34}
    });

    assert.equal(
        namespaces[1].name, 'ExplicitlyNamedNamespace.NestedNamespace');
    assert.equal(namespaces[1].description, '\n');
    assert.deepEqual(namespaces[1].warnings, []);
    assert.deepEqual(namespaces[1].sourceRange, {
      file: 'namespace-named.js',
      start: {line: 8, column: 0},
      end: {line: 10, column: 2}
    });
  });

  test('scans unnamed namespaces', async() => {
    const namespaces = await getNamespaces('namespace-unnamed.js');
    assert.equal(namespaces.length, 2);

    assert.equal(namespaces[0].name, 'ImplicitlyNamedNamespace');
    assert.equal(namespaces[0].description, '\n');
    assert.deepEqual(namespaces[0].warnings, []);
    assert.deepEqual(namespaces[0].sourceRange, {
      file: 'namespace-unnamed.js',
      start: {line: 3, column: 0},
      end: {line: 3, column: 34},
    });

    assert.equal(
        namespaces[1].name, 'ImplicitlyNamedNamespace.NestedNamespace');
    assert.equal(namespaces[1].description, '\n');
    assert.deepEqual(namespaces[1].warnings, []);
    assert.deepEqual(namespaces[1].sourceRange, {
      file: 'namespace-unnamed.js',
      start: {line: 8, column: 0},
      end: {line: 10, column: 2},
    });
  });

  test('scans named, dynamic namespaces', async() => {
    const namespaces = await getNamespaces('namespace-dynamic-named.js');
    assert.equal(namespaces.length, 2);

    assert.equal(namespaces[0].name, 'DynamicNamespace.ArrayNotation');
    assert.equal(namespaces[0].description, '\n');
    assert.deepEqual(namespaces[0].warnings, []);
    assert.deepEqual(namespaces[0].sourceRange, {
      file: 'namespace-dynamic-named.js',
      start: {line: 3, column: 0},
      end: {line: 5, column: 2},
    });

    assert.equal(namespaces[1].name, 'DynamicNamespace.Aliased');
    assert.equal(namespaces[1].description, '\n');
    assert.deepEqual(namespaces[1].warnings, []);
    assert.deepEqual(namespaces[1].sourceRange, {
      file: 'namespace-dynamic-named.js',
      start: {line: 10, column: 0},
      end: {line: 12, column: 2},
    });
  });

  test('throws unnamed, dynamic namespaces', async() => {
    const namespaces = await getNamespaces('namespace-dynamic-unnamed.js');
    assert.equal(namespaces.length, 1);

    assert.equal(namespaces[0].name, 'DynamicNamespace.ArrayNotation');
    assert.equal(namespaces[0].description, '\n');
    assert.deepEqual(namespaces[0].warnings, []);
    assert.deepEqual(namespaces[0].sourceRange, {
      file: 'namespace-dynamic-unnamed.js',
      start: {line: 3, column: 0},
      end: {line: 5, column: 2},
    });
  });

});
