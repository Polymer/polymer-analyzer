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

import {Analyzer} from './analyzer';
import {Feature} from './model/model';
import {generateElementMetadata} from './generate-analysis';
import {FSUrlLoader} from './url-loader/fs-url-loader';
import {PackageUrlResolver} from './url-loader/package-url-resolver';

process.on('unhandledRejection', (reason: Error, p: Promise<any>) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

const analyzer = new Analyzer({
  urlLoader: new FSUrlLoader(process.cwd()),
  urlResolver: new PackageUrlResolver(),
});

const isInTests = /(\b|\/|\\)(test)(\/|\\)/;
const isNotTest = (f: Feature) =>
    !isInTests.test((f.sourceRange && f.sourceRange.file) || '');

async function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    const _package = await analyzer.analyzePackage();
    const metadata = generateElementMetadata(_package, '', isNotTest);
    const json = JSON.stringify(metadata, null, 2);
    process.stdout.write(json);
    process.stdout.write('\n');
  } else {
    const documents =
        await Promise.all(inputs.map((input) => analyzer.analyze(input)));
    const metadata = generateElementMetadata(documents, '', isNotTest);
    const json = JSON.stringify(metadata, null, 2);
    process.stdout.write(json);
    process.stdout.write('\n');
  }
}

main()
    .catch((err) => {
      console.error(err.stack || err.message || err);
    });
