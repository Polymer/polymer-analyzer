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

import {ComponentScanner, ScannedComponent} from '../../a-frame/component-scanner';
import {Analyzer} from '../../analyzer';
import {Visitor} from '../../javascript/estree-visitor';
import {JavaScriptDocument} from '../../javascript/javascript-document';
import {JavaScriptParser} from '../../javascript/javascript-parser';
import {Severity, Warning} from '../../warning/warning';
import {WarningPrinter} from '../../warning/warning-printer';

suite('A-Frame Component Scanner', () => {

  let document: JavaScriptDocument;
  let components: Map<string, ScannedComponent>;
  let componentsList: ScannedComponent[];
  let warnings: Warning[];

  const fileName = 'static/a-frame/components.js';
  const contents =
      fs.readFileSync(path.resolve(__dirname, '../', fileName), 'utf8');
  ;
  const loader = {canLoad: () => true, load: () => Promise.resolve(contents)};
  const warningPrinter = new WarningPrinter(
      null as any, {analyzer: new Analyzer({urlLoader: loader})});

  async function getUnderlinedText(warning: Warning) {
    return '\n' + await warningPrinter.getUnderlinedText(warning.sourceRange);
  }


  suiteSetup(async() => {
    const parser = new JavaScriptParser({sourceType: 'script'});

    document = parser.parse(contents, 'static/a-frame/components.js');
    const scanner = new ComponentScanner();
    const visit = (visitor: Visitor) =>
        Promise.resolve(document.visit([visitor]));

    const result = await scanner.scan(document, visit);
    const features = result.features;
    warnings = result.warnings;
    components = new Map();
    componentsList = <ScannedComponent[]>features.filter(
        (e) => e instanceof ScannedComponent);
    for (const component of componentsList) {
      components.set(component.name, component);
    }
  });

  test('Finds component registrations', () => {
    assert.deepEqual(
        componentsList.map(b => b.name).sort(), ['aabb-collider'].sort());
  });

  test('Warns on bad component registrations', async() => {
    assert.containSubset(warnings, [
      {code: 'aframe.register.num-args', severity: Severity.ERROR},
      {code: 'aframe.register.num-args', severity: Severity.ERROR},
      {code: 'aframe.register.num-args', severity: Severity.ERROR},
      {code: 'aframe.register.cant-static-name', severity: Severity.WARNING}, {
        code: 'aframe.register.name-must-be-string',
        severity: Severity.WARNING
      }
    ]);

    const underlines =
        await Promise.all(warnings.map(w => getUnderlinedText(w)));
    assert.deepEqual(underlines, [
      `
AFRAME.registerComponent();
~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      `
AFRAME.registerComponent('no-definition');
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      `
AFRAME.registerComponent('too-many-args', {}, {});
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      `
    Math.random() > 0.5 ? 'not-statically-analyzable' : 'definitely-not', {});
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
      `
AFRAME.registerComponent(10, {});
                         ~~`
    ]);
  });
});
