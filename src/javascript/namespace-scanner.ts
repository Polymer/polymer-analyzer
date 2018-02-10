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

import * as babel from 'babel-types';

import {Warning, ScannedProperty} from '../model/model';
import {Result} from '../model/analysis';

import {getIdentifierName, getNamespacedIdentifier} from './ast-value';
import {Visitor} from './estree-visitor';
import * as esutil from './esutil';
import {JavaScriptDocument} from './javascript-document';
import {JavaScriptScanner} from './javascript-scanner';
import * as jsdoc from './jsdoc';
import {ScannedNamespace} from './namespace';

export class NamespaceScanner implements JavaScriptScanner {
  async scan(
      document: JavaScriptDocument,
      visit: (visitor: Visitor) => Promise<void>) {
    const visitor = new NamespaceVisitor(document);
    const propertyFinder = new NamespacePropertyFinder(document);

    await Promise.all([
      visit(visitor),
      visit(propertyFinder)
    ]);

    for (const [namespace, properties] of propertyFinder.properties) {
      if (visitor.namespaces.has(namespace)) {
        const ns = visitor.namespaces.get(namespace)!;
        for (const prop of properties.values()) {
          ns.properties.set(prop.name, prop);
        }
      }
    }

    return {
      features: [...visitor.namespaces.values()],
      warnings: visitor.warnings
    };
  }
}

class NamespacePropertyFinder implements Visitor {
  properties = new Map<string, Map<string, ScannedProperty>>();
  warnings: Warning[] = [];
  private readonly _document: JavaScriptDocument;

  constructor(document: JavaScriptDocument) {
    this._document = document;
  }

  enterExpressionStatement(node: babel.ExpressionStatement) {
    if (!babel.isAssignmentExpression(node.expression) &&
        !babel.isMemberExpression(node.expression)) {
      return;
    }

    const jsdocAnn = jsdoc.parseJsdoc(esutil.getAttachedComment(node) || '');

    if (!jsdoc.hasTag(jsdocAnn, 'memberof')) {
      return;
    }

    const memberofTag = jsdoc.getTag(jsdocAnn, 'memberof');
    const namespace = memberofTag && memberofTag.description;
    let prop: ScannedProperty|undefined = undefined;
    let namespacedName: string|undefined;

    if (!namespace) {
      return;
    }

    if (babel.isAssignmentExpression(node.expression)) {
      if (babel.isFunctionExpression(node.expression.right)) {
        return;
      }
      namespacedName = getIdentifierName(node.expression.left);
    } else if (babel.isMemberExpression(node.expression)) {
      namespacedName = getIdentifierName(node.expression);
    }

    if (!namespacedName || namespacedName.indexOf('.prototype.') !== -1) {
      return;
    }

    const name = namespacedName.substring(namespacedName.lastIndexOf('.') + 1);

    prop = this._createPropertyFromExpression(name, node.expression, jsdocAnn);

    if (prop) {
      let properties = this.properties.get(namespace);

      if (!properties) {
        properties = new Map<string, ScannedProperty>();
        this.properties.set(namespace, properties);
      }

      properties.set(name, prop);
    }
  }

  private _createPropertyFromExpression(
      name: string, node: babel.AssignmentExpression|babel.MemberExpression,
      jsdocAnn: jsdoc.Annotation|undefined) {
    let description;
    let type;
    let readOnly = false;
    const privacy = esutil.getOrInferPrivacy(name, jsdocAnn);
    const sourceRange = this._document.sourceRangeForNode(node)!;
    const warnings: Warning[] = [];

    if (jsdocAnn) {
      description = jsdoc.getDescription(jsdocAnn);
      readOnly = jsdoc.hasTag(jsdocAnn, 'readonly');
    }

    let detectedType: Result<string, Warning>;

    if (babel.isAssignmentExpression(node)) {
      detectedType =
        esutil.getClosureType(node.right, jsdocAnn, sourceRange, this._document);
    } else {
      detectedType =
        esutil.getClosureType(node, jsdocAnn, sourceRange, this._document);
    }

    if (detectedType.successful) {
      type = detectedType.value;
    } else {
      warnings.push(detectedType.error);
      type = '?';
    }

    return {
      name,
      astNode: node,
      type,
      jsdoc: jsdocAnn,
      sourceRange,
      description,
      privacy,
      warnings,
      readOnly,
    };
  }
}

class NamespaceVisitor implements Visitor {
  namespaces = new Map<string, ScannedNamespace>();
  document: JavaScriptDocument;
  warnings: Warning[] = [];

  constructor(document: JavaScriptDocument) {
    this.document = document;
  }

  /**
   * Look for object declarations with @namespace in the docs.
   */
  enterVariableDeclaration(
      node: babel.VariableDeclaration, _parent: babel.Node) {
    if (node.declarations.length !== 1) {
      return;  // Ambiguous.
    }
    this._initNamespace(node, node.declarations[0].id);
  }

  /**
   * Look for object assignments with @namespace in the docs.
   */
  enterAssignmentExpression(
      node: babel.AssignmentExpression, parent: babel.Node) {
    this._initNamespace(parent, node.left);
  }

  enterObjectProperty(node: babel.ObjectProperty, _parent: babel.Node) {
    this._initNamespace(node, node.key);
  }

  private _initNamespace(node: babel.Node, nameNode: babel.Node) {
    const comment = esutil.getAttachedComment(node);
    // Quickly filter down to potential candidates.
    if (!comment || comment.indexOf('@namespace') === -1) {
      return;
    }
    const analyzedName = getIdentifierName(nameNode);
    const docs = jsdoc.parseJsdoc(comment);
    const namespaceTag = jsdoc.getTag(docs, 'namespace');
    const explicitName = namespaceTag && namespaceTag.name;
    let namespaceName;
    if (explicitName) {
      namespaceName = explicitName;
    } else if (analyzedName) {
      namespaceName = getNamespacedIdentifier(analyzedName, docs);
    } else {
      // TODO(fks): Propagate a warning if name could not be determined
      return;
    }

    const sourceRange = this.document.sourceRangeForNode(node);
    if (!sourceRange) {
      throw new Error(
          `Unable to determine sourceRange for @namespace: ${comment}`);
    }

    const summaryTag = jsdoc.getTag(docs, 'summary');
    const summary = (summaryTag && summaryTag.description) || '';
    const description = docs.description;
    const properties = getNamespaceProperties(node, this.document);

    this.namespaces.set(namespaceName, new ScannedNamespace(
        namespaceName, description, summary, node, properties, docs, sourceRange));
  }
}

function getNamespaceProperties(node: babel.Node, document: JavaScriptDocument): Map<string, ScannedProperty> {
  const properties = new Map<string, ScannedProperty>();
  const accessors = new Map<
      string,
      {getter?: babel.ObjectMethod, setter?: babel.ObjectMethod}>();

  let child: babel.ObjectExpression;

  if (babel.isVariableDeclaration(node)) {
    if (node.declarations.length !== 1) {
      return properties;
    }

    const declaration = node.declarations[0].init;

    if (!babel.isObjectExpression(declaration)) {
      return properties;
    }

    child = declaration;
  } else if (babel.isExpressionStatement(node) &&
             babel.isAssignmentExpression(node.expression) &&
             babel.isObjectExpression(node.expression.right)) {
    child = node.expression.right;
  } else {
    return properties;
  }

  for (const member of child.properties) {
    if (babel.isSpreadProperty(member) || member.computed) {
      continue;
    }

    const name = getIdentifierName(member.key)!;

    if (babel.isObjectMethod(member) || babel.isFunctionExpression(member.value)) {
      if (babel.isObjectMethod(member) && (member.kind === 'get' || member.kind === 'set')) {
        let accessor = accessors.get(name);

        if (!accessor) {
          accessor = {};
          accessors.set(name, accessor);
        }

        if (member.kind === 'get') {
          accessor.getter = member;
        } else {
          accessor.setter = member;
        }
      }

      continue;
    }

    const astNode = member.key;
    const sourceRange = document.sourceRangeForNode(member)!;
    const jsdocAnn = jsdoc.parseJsdoc(esutil.getAttachedComment(member) || '');
    const detectedType = esutil.getClosureType(member.value, jsdocAnn, sourceRange, document);
    let type: string|undefined = undefined;

    if (detectedType.successful) {
      type = detectedType.value;
    }

    properties.set(name, {
      name,
      astNode,
      type,
      jsdoc: jsdocAnn,
      sourceRange,
      description: jsdocAnn ? jsdoc.getDescription(jsdocAnn) : undefined,
      privacy: esutil.getOrInferPrivacy(name, jsdocAnn),
      warnings: [],
      readOnly: jsdoc.hasTag(jsdocAnn, 'readonly'),
    });
  }

  for (const val of accessors.values()) {
    let getter: ScannedProperty|null = null;
    let setter: ScannedProperty|null = null;

    if (val.getter) {
      const parsedJsdoc = jsdoc.parseJsdoc(esutil.getAttachedComment(val.getter) || '');
      getter = esutil.extractPropertyFromGetterOrSetter(val.getter, parsedJsdoc, document);
    }

    if (val.setter) {
      const parsedJsdoc = jsdoc.parseJsdoc(esutil.getAttachedComment(val.setter) || '');
      setter = esutil.extractPropertyFromGetterOrSetter(val.setter, parsedJsdoc, document);
    }

    const prop = getter || setter;
    if (!prop) {
      continue;
    }

    if (!prop.readOnly) {
      prop.readOnly = (val.setter === undefined);
    }

    properties.set(prop.name, prop);
  }

  return properties;
}
