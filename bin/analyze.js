#!/usr/bin/env node

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

'use strict';

process.title = 'analyze';

require('source-map-support').install();

const {Analyzer} = require('../lib/analyzer');
const {generateAnalysisMetadata} = require('../lib/generate-analysis');
const {FSUrlLoader} = require('../lib/url-loader/fs-url-loader');
const {PackageUrlResolver} = require('../lib/url-loader/package-url-resolver');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

const analyzer = new Analyzer({
  urlLoader: new FSUrlLoader(process.cwd()),
  urlResolver: new PackageUrlResolver(),
});

const isInTests = /(\b|\/|\\)(test)(\/|\\)/;
const isNotTest = (f) => !isInTests.test(f.sourceRange.file);

const inputs = process.argv.slice(2);

if (inputs.length === 0) {
  analyzer.analyzePackage()
      .then((_package) => {
        const metadata = generateAnalysisMetadata(_package, '', isNotTest);
        const json = JSON.stringify(metadata, null, 2);
        process.stdout.write(json);
        process.stdout.write('\n');
      })
      .catch((e) => {
        console.error('error from analyzePackage');
        console.error(e);
      });
} else {
  Promise
      .all(inputs.map((input) => analyzer.analyze(input)).then((documents) => {
        const metadata = generateAnalysisMetadata(documents, '', isNotTest);
        const json = JSON.stringify(metadata, null, 2);
        process.stdout.write(json);
        process.stdout.write('\n');
      }))
      .catch((e) => {
        console.error('error from analyze');
        console.error(e);
      });
}
