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

import {Analysis} from '../analysis';
import {Analyzer} from '../analyzer';
import {FSUrlLoader} from '../url-loader/fs-url-loader';

suite('Analysis', function() {
  const basedir = path.join(__dirname, 'static', 'analysis');
  const analysisFixtureDirs = fs.readdirSync(basedir)
                                  .map(p => path.join(basedir, p))
                                  .filter(p => fs.statSync(p).isDirectory());

  for (const analysisFixtureDir of analysisFixtureDirs) {
    const testName = `correctly produces a serialized analysis.json ` +
        `for fixture dir \`${path.basename(analysisFixtureDir)}\``;
    test(testName, async function() {
      const analysis = await analyzeDir(analysisFixtureDir).resolve();
      assert.deepEqual(
          analysis.serialize(),
          JSON.parse(fs.readFileSync(
              path.join(analysisFixtureDir, 'analysis.json'), 'utf-8')));
    });
  }
});

function analyzeDir(baseDir: string): Analyzer {
  const analyzer = new Analyzer({urlLoader: new FSUrlLoader(baseDir)});
  const _analyzeDir = (dir: string): void => {
    for (const filename of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, filename);
      if (fs.statSync(fullPath).isDirectory()) {
        return _analyzeDir(fullPath);
      } else {
        analyzer.analyze(fullPath.substring(baseDir.length));
      }
    }
  };
  _analyzeDir(baseDir);
  return analyzer;
}