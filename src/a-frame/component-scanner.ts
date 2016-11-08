/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
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

import * as astValue from '../javascript/ast-value';
import {Visitor} from '../javascript/estree-visitor';
import {JavaScriptDocument} from '../javascript/javascript-document';
import {JavaScriptScanner} from '../javascript/javascript-scanner';
import {ScannedFeature} from '../model/model';
import {SourceRange} from '../model/model';
import {ScanResult} from '../scanning/scanner';
import {Severity, Warning} from '../warning/warning';

export interface Options {
  name: string;
  sourceRange: SourceRange;
  astNode: estree.Node;
  warnings: Warning[];
}

export class ScannedComponent implements ScannedFeature {
  name: string;
  sourceRange: SourceRange;
  astNode: estree.Node;
  warnings: Warning[];

  constructor(constructionOptions: Options) {
    this.name = constructionOptions.name;
    this.sourceRange = constructionOptions.sourceRange;
    this.astNode = constructionOptions.astNode;
    this.warnings = constructionOptions.warnings;
  }
}

export class ComponentScanner implements JavaScriptScanner {
  warnings: Warning[] = [];
  async scan(
      document: JavaScriptDocument,
      visit: (visitor: Visitor) => Promise<void>): Promise<ScanResult> {
    let visitor = new ComponentFinder(document);
    await visit(visitor);
    this.warnings = visitor.warnings;
    return {
      features: Array.from(visitor.components),
      warnings: visitor.warnings
    };
  }
}

class ComponentFinder implements Visitor {
  /** The behaviors we've found. */
  components = new Set<ScannedComponent>();

  document: JavaScriptDocument;
  warnings: Warning[] = [];
  constructor(document: JavaScriptDocument) {
    this.document = document;
  }

  enterCallExpression(node: estree.CallExpression, _parent: estree.Node) {
    if (node.type !== 'CallExpression') {
      return;
    }
    const calleeName = astValue.getIdentifierName(node.callee);
    if (!calleeName) {
      return;
    }
    if (calleeName === 'AFRAME.registerComponent') {
      const component = this.scanComponent(node);
      if (component) {
        this.components.add(component);
      }
    }
  }

  private scanComponent(call: estree.CallExpression): ScannedComponent|void {
    const registerArguments = call.arguments;
    if (registerArguments.length !== 2) {
      this.warnings.push({
        code: 'aframe.register.num-args',
        severity: Severity.ERROR,
        message:
            'AFRAME.registerComponent takes two arguments, the name and the definition.',
        sourceRange: this.document.sourceRangeForNode(call)!
      });
      return;
    }
    const nameExpr = registerArguments[0];
    const definition = registerArguments[1];
    const name = astValue.expressionToValue(nameExpr);
    if (name == null) {
      this.warnings.push({
        code: 'aframe.register.cant-static-name',
        severity: Severity.WARNING,
        message:
            'Unable to statically determine the component name from the first argument to AFRAME.registerComponent',
        sourceRange: this.document.sourceRangeForNode(nameExpr)!
      });
      return;
    }
    const nameType = typeof name;
    if (nameType !== 'string') {
      this.warnings.push({
        code: 'aframe.register.name-must-be-string',
        severity: Severity.WARNING,
        message: 'The registered component name must be a string.',
        sourceRange: this.document.sourceRangeForNode(nameExpr)!
      });
      return;
    }

    return new ScannedComponent({
      name: name as string,
      sourceRange: this.document.sourceRangeForNode(definition)!,
      astNode: definition,
      warnings: []
    });
  }
}
