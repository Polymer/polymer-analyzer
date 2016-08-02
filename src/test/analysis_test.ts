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

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import {Analysis, ValidationError} from '../analysis';
import {Analyzer} from '../analyzer';
import {ElementDescriptor} from '../ast/ast';
import {AnalyzedPackage} from '../serialized-analysis';
import {FSUrlLoader} from '../url-loader/fs-url-loader';


const onlyTests = new Set([]);  // Should be empty when not debugging.
suite('Analysis', function() {
  const basedir = path.join(__dirname, 'static', 'analysis');
  const analysisFixtureDirs = fs.readdirSync(basedir)
                                  .map(p => path.join(basedir, p))
                                  .filter(p => fs.statSync(p).isDirectory());

  for (const analysisFixtureDir of analysisFixtureDirs) {
    const testBaseName = path.basename(analysisFixtureDir);
    const testDefiner = onlyTests.has(testBaseName) ? test.only : test;
    const testName = `correctly produces a serialized analysis.json ` +
        `for fixture dir \`${testBaseName}\``;
    testDefiner(testName, async function() {
      const analysis = await analyzeDir(analysisFixtureDir).resolve();

      const pathToCanonical = path.join(analysisFixtureDir, 'analysis.json');
      const serializedAnalyses = analysis.serialize();
      for (const analyzedPackages of serializedAnalyses) {
        Analysis.validate(analyzedPackages);
      }
      try {
        assert.deepEqual(
            {packages: serializedAnalyses},
            JSON.parse(fs.readFileSync(pathToCanonical, 'utf-8')));
      } catch (e) {
        console.log(
            `Expected contents of ${pathToCanonical}:\n${JSON.stringify(serializedAnalyses, null, 2)}`);
        throw e;
      }
    });
  }

  test('throws when validating a valid AnalyzedPackage', function() {
    try {
      Analysis.validate(<any>{});
    } catch (err) {
      assert.instanceOf(err, ValidationError);
      let valError: ValidationError = err;
      assert(valError.errors.length > 0);
      assert.include(valError.message, `requires property "elements"`);
      return;
    }
    throw new Error('expected Analysis validation to fail!');
  });

  test(`doesn't throw when validating a valid AnalyzedPackage`, function() {
    Analysis.validate({elements: [], schema_version: '1.0.0'});
  });

  test(`doesn't throw when validating a version from the future`, function() {
    Analysis.validate(
        <any>{elements: [], schema_version: '1.0.1', new_field: 'stuff here'});
  });

  test(`throws when validating a bad version`, function() {
    try {
      Analysis.validate(<any>{
        elements: [],
        schema_version: '5.1.1',
        new_field: 'stuff here'
      });
    } catch (e) {
      assert.include(e.message, 'Invalid schema_version in AnalyzedPackage');
      return;
    }
    throw new Error('expected Analysis validation to fail!');
  });

});

function analyzeDir(baseDir: string): Analyzer {
  const analyzer = new Analyzer({urlLoader: new FSUrlLoader(baseDir)});
  function _analyzeDir(dir: string): void {
    for (const filename of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, filename);
      if (fs.statSync(fullPath).isDirectory()) {
        _analyzeDir(fullPath);
      } else {
        analyzer.analyze(fullPath.substring(baseDir.length));
      }
    }
  };
  _analyzeDir(baseDir);
  return analyzer;
}