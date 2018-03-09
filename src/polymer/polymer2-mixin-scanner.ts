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

import {NodePath, Scope} from 'babel-traverse';
import * as babel from 'babel-types';

import {getIdentifierName, getNamespacedIdentifier} from '../javascript/ast-value';
import {extractPropertiesFromClass} from '../javascript/class-scanner';
import {Visitor} from '../javascript/estree-visitor';
import * as esutil from '../javascript/esutil';
import {getMethods, getOrInferPrivacy, getStaticMethods} from '../javascript/esutil';
import {JavaScriptDocument} from '../javascript/javascript-document';
import * as jsdoc from '../javascript/jsdoc';
import {Warning} from '../model/model';

import {ScannedPolymerElementMixin} from './polymer-element-mixin';
import {getPolymerProperties} from './polymer2-config';

export class MixinVisitor implements Visitor {
  mixins: ScannedPolymerElementMixin[] = [];
  private _document: JavaScriptDocument;

  private _currentMixin: ScannedPolymerElementMixin|null = null;
  private _currentMixinNode: babel.Node|null = null;
  private _currentMixinFunction: babel.Function|null = null;
  readonly warnings: Warning[] = [];

  constructor(document: JavaScriptDocument) {
    this._document = document;
  }

  enterAssignmentExpression(
      node: babel.AssignmentExpression, parent: babel.Node, path: NodePath) {
    if (!babel.isExpressionStatement(parent)) {
      return;
    }
    const parentComments = esutil.getAttachedComment(parent) || '';
    const parentJsDocs = jsdoc.parseJsdoc(parentComments);
    if (hasMixinFunctionDocTag(parentJsDocs)) {
      const name = getIdentifierName(node.left);
      const namespacedName =
          name ? getNamespacedIdentifier(name, parentJsDocs) : undefined;
      const sourceRange = this._document.sourceRangeForNode(node)!;

      const summaryTag = jsdoc.getTag(parentJsDocs, 'summary');

      if (namespacedName) {
        this._currentMixin = new ScannedPolymerElementMixin({
          name: namespacedName,
          sourceRange,
          astNode: node,
          description: parentJsDocs.description,
          summary: (summaryTag && summaryTag.description) || '',
          privacy: getOrInferPrivacy(namespacedName, parentJsDocs),
          jsdoc: parentJsDocs,
          mixins: jsdoc.getMixinApplications(
              this._document, node, parentJsDocs, this.warnings, path.scope),
        });
        this._currentMixinNode = node;
        this.mixins.push(this._currentMixin);
      } else {
        // TODO(rictic): warn for a mixin whose name we can't determine.
      }
    }
  }

  enterFunctionDeclaration(
      node: babel.FunctionDeclaration, _parent: babel.Node, path: NodePath) {
    const nodeComments = esutil.getBestComment(path);
    if (nodeComments === undefined) {
      return;
    }
    const nodeJsDocs = jsdoc.parseJsdoc(nodeComments);
    if (!hasMixinFunctionDocTag(nodeJsDocs)) {
      return;
    }
    const name = node.id.name;
    const namespacedName =
        name ? getNamespacedIdentifier(name, nodeJsDocs) : undefined;
    if (namespacedName === undefined) {
      // Warn about a mixin whose name we can't infer.
      return;
    }
    this.initializeMixin(node, namespacedName, nodeJsDocs, path.scope);
  }

  leaveFunctionDeclaration(
      node: babel.FunctionDeclaration, _parent: babel.Node) {
    this.clearOnLeave(node);
  }

  enterVariableDeclaration(
      node: babel.VariableDeclaration, _parent: babel.Node, path: NodePath) {
    const comment = esutil.getBestComment(path);
    if (comment === undefined) {
      return;
    }
    const docs = jsdoc.parseJsdoc(comment);
    if (!hasMixinFunctionDocTag(docs)) {
      return;
    }
    if (node.declarations.length !== 1) {
      return;
    }
    const declaration = node.declarations[0];
    const name = getIdentifierName(declaration.id);
    if (name === undefined) {
      // TODO(rictic); warn about being unable to determine mixin name.
      return;
    }
    this.initializeMixin(node, name, docs, path.scope);
  }

  leaveVariableDeclaration(
      node: babel.VariableDeclaration, _parent: babel.Node) {
    this.clearOnLeave(node);
  }

  private initializeMixin(
      node: babel.Node, name: string, docs: jsdoc.Annotation, scope: Scope) {
    const sourceRange = this._document.sourceRangeForNode(node)!;
    const summaryTag = jsdoc.getTag(docs, 'summary');
    const namespacedName = getNamespacedIdentifier(name, docs);
    const mixin = new ScannedPolymerElementMixin({
      name: namespacedName,
      sourceRange,
      astNode: node,
      description: docs.description,
      summary: (summaryTag && summaryTag.description) || '',
      privacy: getOrInferPrivacy(namespacedName, docs),
      jsdoc: docs,
      mixins: jsdoc.getMixinApplications(
          this._document, node, docs, this.warnings, scope)
    });
    this._currentMixin = mixin;
    this._currentMixinNode = node;
    this.mixins.push(this._currentMixin);
  }
  private clearOnLeave(node: babel.Node) {
    if (this._currentMixinNode === node) {
      this._currentMixin = null;
      this._currentMixinNode = null;
      this._currentMixinFunction = null;
    }
  }

  enterFunctionExpression(node: babel.FunctionExpression, _parent: babel.Node) {
    if (this._currentMixin != null && this._currentMixinFunction == null) {
      this._currentMixinFunction = node;
    }
  }

  enterArrowFunctionExpression(
      node: babel.ArrowFunctionExpression, _parent: babel.Node) {
    if (this._currentMixin != null && this._currentMixinFunction == null) {
      this._currentMixinFunction = node;
    }
  }

  enterClassExpression(node: babel.ClassExpression, parent: babel.Node) {
    if (!babel.isReturnStatement(parent) &&
        !babel.isArrowFunctionExpression(parent)) {
      return;
    }
    this._handleClass(node);
  }

  enterClassDeclaration(node: babel.ClassDeclaration, _parent: babel.Node) {
    const comment = esutil.getAttachedComment(node) || '';
    const docs = jsdoc.parseJsdoc(comment);
    const isMixinClass = hasMixinClassDocTag(docs);
    if (isMixinClass) {
      this._handleClass(node);
    }
  }

  private _handleClass(node: babel.ClassDeclaration|babel.ClassExpression) {
    const mixin = this._currentMixin;
    if (mixin == null) {
      return;
    }

    mixin.classAstNode = node;
    const classProperties = extractPropertiesFromClass(node, this._document);
    for (const prop of classProperties.values()) {
      mixin.addProperty(prop);
    }
    getPolymerProperties(node, this._document)
        .forEach((p) => mixin.addProperty(p));
    getMethods(node, this._document).forEach((m) => mixin.addMethod(m));
    getStaticMethods(node, this._document)
        .forEach((m) => mixin.staticMethods.set(m.name, m));

    mixin.events = esutil.getEventComments(node);
    // mixin.sourceRange = this._document.sourceRangeForNode(node);

    return mixin;
  }
}

export function hasMixinFunctionDocTag(docs: jsdoc.Annotation) {
  // TODO(justinfagnani): remove polymerMixin support
  return (jsdoc.hasTag(docs, 'polymer') &&
          jsdoc.hasTag(docs, 'mixinFunction')) ||
      jsdoc.hasTag(docs, 'polymerMixin');
}

export function hasMixinClassDocTag(docs: jsdoc.Annotation) {
  // TODO(justinfagnani): remove polymerMixinClass support
  return (jsdoc.hasTag(docs, 'polymer') && jsdoc.hasTag(docs, 'mixinClass')) ||
      jsdoc.hasTag(docs, 'polymerMixinClass');
}
