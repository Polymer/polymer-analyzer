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

import * as estree from 'estree';

import {Warning} from '../index';
import {Visitor} from '../javascript/estree-visitor';
import * as esutil from '../javascript/esutil';
import {JavaScriptDocument} from '../javascript/javascript-document';
import {JavaScriptScanner} from '../javascript/javascript-scanner';
import * as jsdoc from '../javascript/jsdoc';
import {Severity} from '../model/model';

import {toScannedMethod, toScannedPolymerProperty} from './js-utils';
import {ScannedPolymerCoreFeature} from './polymer-core-feature';

/**
 * Scans for Polymer 1.x core "features".
 *
 * In the Polymer 1.x core library, the `Polymer.Base` prototype is dynamically
 * augmented with properties via calls to `Polymer.Base._addFeature`. These
 * calls are spread across multiple files and split between the micro, mini,
 * and standard "feature layers". Polymer 2.x does not use this pattern.
 *
 * Example: https://github.com/Polymer/polymer/blob/1.x/src/mini/debouncer.html
 */
export class PolymerCoreFeatureScanner implements JavaScriptScanner {
  async scan(
      document: JavaScriptDocument,
      visit: (visitor: Visitor) => Promise<void>) {
    const visitor = new PolymerCoreFeatureVisitor(document);
    await visit(visitor);
    return {features: visitor.features};
  }
}

class PolymerCoreFeatureVisitor implements Visitor {
  features: ScannedPolymerCoreFeature[] = [];

  constructor(private document: JavaScriptDocument) {
  }

  /**
   * Scan for `Polymer.Base = {...}`.
   */
  enterAssignmentExpression(
      assignment: estree.AssignmentExpression, parent: estree.Node) {
    if (assignment.left.type !== 'MemberExpression' ||
        !esutil.matchesCallExpression(assignment.left, ['Polymer', 'Base'])) {
      return;
    }

    const parsedJsdoc =
        jsdoc.parseJsdoc(esutil.getAttachedComment(parent) || '');
    const feature = new ScannedPolymerCoreFeature(
        this.document.sourceRangeForNode(assignment),
        assignment,
        parsedJsdoc.description.trim(),
        parsedJsdoc);
    this.features.push(feature);

    const rhs = assignment.right;
    if (rhs.type !== 'ObjectExpression') {
      feature.warnings.push(new Warning({
        message: `Expected assignment to \`Polymer.Base\` to be an object.` +
            `Got \`${rhs.type}\` instead.`,
        severity: Severity.ERROR,
        code: 'invalid-polymer-base-assignment',
        sourceRange: this.document.sourceRangeForNode(assignment)!,
      }));
      return;
    }

    this._scanObjectProperties(rhs, feature);
  }

  /**
   * Scan for `addFeature({...})`.
   */
  enterCallExpression(call: estree.CallExpression, parent: estree.Node) {
    if (call.callee.type !== 'MemberExpression' ||
        !esutil.matchesCallExpression(
            call.callee, ['Polymer', 'Base', '_addFeature'])) {
      return;
    }

    const parsedJsdoc =
        jsdoc.parseJsdoc(esutil.getAttachedComment(parent) || '');
    const feature = new ScannedPolymerCoreFeature(
        this.document.sourceRangeForNode(call),
        call,
        parsedJsdoc.description.trim(),
        parsedJsdoc);
    this.features.push(feature);

    if (call.arguments.length !== 1) {
      feature.warnings.push(new Warning({
        message:
            `Expected only one argument to \`Polymer.Base._addFeature\`. ` +
            `Got ${call.arguments.length}.`,
        severity: Severity.ERROR,
        code: 'invalid-polymer-core-feature-call',
        sourceRange: this.document.sourceRangeForNode(call)!,
      }));
      return;
    }

    const arg = call.arguments[0];
    if (arg.type !== 'ObjectExpression') {
      feature.warnings.push(new Warning({
        message: `Expected argument to \`Polymer.Base._addFeature\` to be an ` +
            `object. Got \`${arg.type}\` instead.`,
        severity: Severity.ERROR,
        code: 'invalid-polymer-core-feature-call',
        sourceRange: this.document.sourceRangeForNode(call)!,
      }));
      return;
    }

    this._scanObjectProperties(arg, feature);
  }

  /**
   * Scan all properties of the given object expression and add them to the
   * given feature.
   */
  private _scanObjectProperties(
      obj: estree.ObjectExpression, feature: ScannedPolymerCoreFeature) {
    for (const prop of obj.properties) {
      const sourceRange = this.document.sourceRangeForNode(prop);
      if (!sourceRange) {
        continue;
      }
      if (esutil.isFunctionType(prop.value)) {
        const method = toScannedMethod(prop, sourceRange);
        feature.methods.set(method.name, method);
      } else {
        const property = toScannedPolymerProperty(prop, sourceRange);
        feature.properties.set(property.name, property);
      }
      // TODO(aomarks) Are there any getters/setters on Polymer.Base?
      // TODO(aomarks) Merge with similar code in polymer-element-scanner.
    }
  }
}
