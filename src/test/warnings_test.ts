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
import * as chalk from 'chalk';
import * as memoryStreams from 'memory-streams';
import * as path from 'path';

import {Severity, Warning} from '../editor-service';
import {FSUrlLoader} from '../url-loader/fs-url-loader';
import {Verbosity, WarningPrinter} from '../warnings';

const dumbNameWarning: Warning = {
  message: 'This is a dumb name for an element.',
  code: 'dumb-element-name',
  severity: Severity.WARNING,
  sourceRange: {
    file: 'vanilla-elements.js',
    start: {column: 6, line: 0},
    end: {column: 22, line: 0}
  }
};

const staticTestDir = path.join(__dirname, 'static');

suite('WarningPrinter', () => {
  let output: NodeJS.WritableStream;
  let printer: WarningPrinter;
  let urlLoader: FSUrlLoader;
  setup(() => {
    output = new memoryStreams.WritableStream();
    urlLoader = new FSUrlLoader(staticTestDir);
    printer = new WarningPrinter(output, {urlLoader, color: false});
  });
  test('can handle printing no warnings', async() => {
    await printer.printWarnings([]);
    assert.equal(output.toString(), '');
  });

  test('can format and print a basic warning', async() => {
    await printer.printWarnings([dumbNameWarning]);
    const actual = output.toString();
    const expected = `
class ClassDeclaration extends HTMLElement {}
      ~~~~~~~~~~~~~~~~

vanilla-elements.js(0,6) warning [dumb-element-name] - This is a dumb name for an element.
`;
    assert.equal(actual, expected);
  });

  test('can format and print one-line warnings', async() => {
    printer = new WarningPrinter(
        output, {urlLoader, verbosity: Verbosity.OneLine, color: false});
    await printer.printWarnings([dumbNameWarning]);
    const actual = output.toString();
    const expected =
        `vanilla-elements.js(0,6) warning [dumb-element-name] - This is a dumb name for an element.\n`;
    assert.equal(actual, expected);
  });

  test('it adds color if configured to do so', async() => {
    printer = new WarningPrinter(output, {urlLoader, color: true});
    await printer.printWarnings([dumbNameWarning]);
    const actual = output.toString();
    assert.isTrue(chalk.hasColor(actual));
    const expected = `
class ClassDeclaration extends HTMLElement {}
\u001b[33m      ~~~~~~~~~~~~~~~~\u001b[39m

vanilla-elements.js(0,6) \u001b[33mwarning\u001b[39m [dumb-element-name] - This is a dumb name for an element.
`;
    assert.equal(actual, expected);
  });
});
