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
import {getIdentifierName, getNamespacedIdentifier} from '../javascript/ast-value';
import {Visitor} from '../javascript/estree-visitor';
import * as esutil from '../javascript/esutil';
import {JavaScriptDocument} from '../javascript/javascript-document';
import {JavaScriptScanner} from '../javascript/javascript-scanner';
import * as jsdoc from '../javascript/jsdoc';
import {ScannedElement, ScannedFeature, ScannedReference, Severity, SourceRange, Warning} from '../model/model';

import {extractObservers} from './declaration-property-handlers';
import {getOrInferPrivacy} from './js-utils';
import {Observer, ScannedPolymerElement} from './polymer-element';
import {getIsValue, getMethods, getProperties} from './polymer2-config';


/**
 * Represents the first argument of a call to customElements.define.
 */
type TagNameExpression = ClassDotIsExpression|StringLiteralExpression;

/** The tagname was the `is` property on an class, like `MyElem.is` */
interface ClassDotIsExpression {
  type: 'is';
  className: string;
  classNameSourceRange: SourceRange;
}
/** The tag name was just a string literal. */
interface StringLiteralExpression {
  type: 'string-literal';
  value: string;
  sourceRange: SourceRange;
}


export interface ScannedAttribute extends ScannedFeature {
  name: string;
  type?: string;
}

export class Polymer2ElementScanner implements JavaScriptScanner {
  async scan(
      document: JavaScriptDocument,
      visit: (visitor: Visitor) => Promise<void>): Promise<ScannedElement[]> {
    const classFinder = new ClassFinder();
    const elementDefinitionFinder =
        new CustomElementsDefineCallFinder(document);
    // Find all classes and all calls to customElements.define()
    await Promise.all([visit(classFinder), visit(elementDefinitionFinder)]);

    const elementDefinitionsByClassName = new Map<string, ElementDefineCall>();
    const elementDefinitionsByClassExpression =
        new Map<estree.ClassExpression, ElementDefineCall>();

    for (const defineCall of elementDefinitionFinder.calls) {
      if (defineCall.clazz.type === 'MaybeChainedIdentifier') {
        elementDefinitionsByClassName.set(defineCall.clazz.name, defineCall);
      } else {
        elementDefinitionsByClassExpression.set(defineCall.clazz, defineCall);
      }
    }
    // TODO(rictic): emit ElementDefineCallFeatures for define calls that don't
    //     map to any local classes?

    const customElements: CustomElementDefinition[] = [];
    const normalClasses = [];
    for (const clazz of classFinder.classes) {
      if (clazz.ast.type === 'ClassExpression') {
        const definition = elementDefinitionsByClassExpression.get(clazz.ast);
        if (definition) {
          customElements.push({clazz, definition});
          continue;
        }
      }
      const definition =
          elementDefinitionsByClassName.get(clazz.namespacedName!) ||
          elementDefinitionsByClassName.get(clazz.name!);
      if (definition) {
        customElements.push({clazz, definition});
        continue;
      }
      // TODO(rictic): remove @polymerElement here.
      //     See: https://github.com/Polymer/polymer-analyzer/issues/605
      if (jsdoc.hasTag(clazz.doc, 'customElement') ||
          jsdoc.hasTag(clazz.doc, 'polymerElement')) {
        customElements.push({clazz});
        continue;
      }
      normalClasses.push(clazz);
    }

    const elementFeatures: ScannedPolymerElement[] = [];
    for (const element of customElements) {
      elementFeatures.push(this._makeElementFeature(element, document));
    }

    // TODO(rictic): handle normalClasses

    // TODO(rictic): gather up the warnings from these visitors and return them
    // too.
    // const warnings = elementDefinitionFinder.warnings;

    return elementFeatures;
  }

  private _makeElementFeature(
      element: CustomElementDefinition,
      document: JavaScriptDocument): ScannedPolymerElement {
    const node = element.clazz.ast;
    const docs = element.clazz.doc;
    const className = element.clazz.namespacedName;
    let tagName;
    // TODO(rictic): support `@customElements explicit-tag-name` from jsdoc
    if (element.definition &&
        element.definition.tagName.type === 'string-literal') {
      tagName = element.definition.tagName.value;
    } else if (
        node.type === 'ClassExpression' || node.type === 'ClassDeclaration') {
      tagName = getIsValue(node);
    }
    let warnings: Warning[] = [];

    let scannedElement: ScannedPolymerElement;
    if (node.type === 'ClassExpression' || node.type === 'ClassDeclaration') {
      const observersResult = this._getObservers(node, document);
      let observers: Observer[] = [];
      if (observersResult) {
        observers = observersResult.observers;
        warnings = warnings.concat(observersResult.warnings);
      }

      scannedElement = new ScannedPolymerElement({
        className,
        tagName,
        astNode: node,
        description: (docs.description || '').trim(),
        events: esutil.getEventComments(node),
        sourceRange: document.sourceRangeForNode(node),
        properties: getProperties(node, document),
        methods: getMethods(node, document),
        superClass: this._getExtends(node, docs, warnings, document),
        mixins: jsdoc.getMixins(document, node, docs, warnings),
        privacy: getOrInferPrivacy(className || '', docs, false),
        observers: observers,
        jsdoc: docs,
      });

      // If a class defines observedAttributes, it overrides what the base
      // classes defined.
      // TODO(justinfagnani): define and handle composition patterns.
      const observedAttributes = this._getObservedAttributes(node, document);

      if (observedAttributes != null) {
        scannedElement.attributes = observedAttributes;
      }

    } else {
      scannedElement = new ScannedPolymerElement({
        className,
        tagName,
        astNode: node,
        jsdoc: docs,
        sourceRange: document.sourceRangeForNode(node)!,
        description: (docs.description || '').trim(),
        superClass: this._getExtends(node, docs, warnings, document),
        mixins: jsdoc.getMixins(document, node, docs, warnings),
        privacy: getOrInferPrivacy(className || '', docs, false),
        events: [],
        properties: [],
        methods: [],
        observers: []
      });
    }


    warnings.forEach((w) => scannedElement.warnings.push(w));

    return scannedElement;
  }

  private _getReturnValueOfStaticGetter(
      node: estree.ClassDeclaration|estree.ClassExpression,
      methodName: string): estree.Node|undefined {
    const observedAttributesDefn: estree.MethodDefinition|undefined =
        node.body.body.find((m) => {
          if (m.type !== 'MethodDefinition' || !m.static) {
            return false;
          }
          return astValue.getIdentifierName(m.key) === methodName;
        });
    if (observedAttributesDefn) {
      const body = observedAttributesDefn.value.body.body[0];
      if (body && body.type === 'ReturnStatement' && body.argument) {
        return body.argument;
      }
    }
  }

  private _getObservers(
      node: estree.ClassDeclaration|estree.ClassExpression,
      document: JavaScriptDocument) {
    const returnedValue = this._getReturnValueOfStaticGetter(node, 'observers');
    if (returnedValue) {
      return extractObservers(returnedValue, document);
    }
  }

  /**
   * Returns the name of the superclass, if any.
   */
  private _getExtends(
      node: estree.Node, docs: jsdoc.Annotation, warnings: Warning[],
      document: JavaScriptDocument): ScannedReference|undefined {
    const extendsAnnotations =
        docs.tags!.filter((tag) => tag.tag === 'extends');

    // prefer @extends annotations over extends clauses
    if (extendsAnnotations.length > 0) {
      const extendsId = extendsAnnotations[0].name;
      // TODO(justinfagnani): we need source ranges for jsdoc annotations
      const sourceRange = document.sourceRangeForNode(node)!;
      if (extendsId == null) {
        warnings.push({
          code: 'class-extends-annotation-no-id',
          message: '@extends annotation with no identifier',
          severity: Severity.WARNING, sourceRange,
        });
      } else {
        return new ScannedReference(extendsId, sourceRange);
      }
    } else if (
        node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      // If no @extends tag, look for a superclass.
      // TODO(justinfagnani): Infer mixin applications and superclass from AST.
      const superClass = node.superClass;
      if (superClass != null) {
        const extendsId = getIdentifierName(superClass);
        if (extendsId != null) {
          const sourceRange = document.sourceRangeForNode(superClass)!;
          return new ScannedReference(extendsId, sourceRange);
        }
      }
    }
  }

  private _getObservedAttributes(
      node: estree.ClassDeclaration|estree.ClassExpression,
      document: JavaScriptDocument) {
    const returnedValue =
        this._getReturnValueOfStaticGetter(node, 'observedAttributes');
    if (returnedValue && returnedValue.type === 'ArrayExpression') {
      return this._extractAttributesFromObservedAttributes(
          returnedValue, document);
    }
  }

  /**
   * Extract attributes from the array expression inside a static
   * observedAttributes method.
   *
   * e.g.
   *     static get observedAttributes() {
   *       return [
   *         /** @type {boolean} When given the element is totally inactive *\/
   *         'disabled',
   *         /** @type {boolean} When given the element is expanded *\/
   *         'open'
   *       ];
   *     }
   */
  private _extractAttributesFromObservedAttributes(
      arry: estree.ArrayExpression, document: JavaScriptDocument) {
    const results: ScannedAttribute[] = [];
    for (const expr of arry.elements) {
      const value = astValue.expressionToValue(expr);
      if (value && typeof value === 'string') {
        let description = '';
        let type: string|null = null;
        const comment = esutil.getAttachedComment(expr);
        if (comment) {
          const annotation = jsdoc.parseJsdoc(comment);
          description = annotation.description || description;
          const tags = annotation.tags || [];
          for (const tag of tags) {
            if (tag.tag === 'type') {
              type = type || tag.type;
            }
            description = description || tag.description || '';
          }
        }
        const attribute: ScannedAttribute = {
          name: value,
          description: description,
          sourceRange: document.sourceRangeForNode(expr),
          astNode: expr,
          warnings: [],
        };
        if (type) {
          attribute.type = type;
        }
        results.push(attribute);
      }
    }
    return results;
  }
}

interface CustomElementDefinition {
  clazz: FoundClass;
  definition?: ElementDefineCall;
}

interface FoundClass {
  name: string|undefined;
  namespacedName: string|undefined;
  doc: jsdoc.Annotation;
  /**
   * This will usually be an class declaration or expression, but if the
   * class is defined just as an application of a mixin on another class it
   * could be a call expression, or other forms!
   */
  ast: estree.Node;
}
class ClassFinder implements Visitor {
  readonly classes: FoundClass[] = [];
  private readonly alreadyMatched = new Set<estree.ClassExpression>();

  enterAssignmentExpression(
      node: estree.AssignmentExpression, parent: estree.Node) {
    this.handleGeneralAssignment(
        astValue.getIdentifierName(node.left), node.right, node, parent);
  }

  enterVariableDeclarator(
      node: estree.VariableDeclarator, parent: estree.Node) {
    if (node.init) {
      this.handleGeneralAssignment(
          astValue.getIdentifierName(node.id), node.init, node, parent);
    }
  }

  private handleGeneralAssignment(
      assignedName: string|undefined, value: estree.Expression,
      assignment: estree.VariableDeclarator|estree.AssignmentExpression,
      statement: estree.Node) {
    const comment = esutil.getAttachedComment(value) ||
        esutil.getAttachedComment(assignment) ||
        esutil.getAttachedComment(statement) || '';
    const doc = jsdoc.parseJsdoc(comment);
    if (value.type === 'ClassExpression') {
      const name =
          assignedName || value.id && astValue.getIdentifierName(value.id);

      this._classFound(name, doc, value);
    } else {
      // TODO(rictic): remove @polymerElement here.
      //     See: https://github.com/Polymer/polymer-analyzer/issues/605
      if (jsdoc.hasTag(doc, 'customElement') ||
          jsdoc.hasTag(doc, 'polymerElement')) {
        this._classFound(assignedName, doc, value);
      }
    }
  }

  enterClassExpression(node: estree.ClassExpression, parent: estree.Node) {
    if (this.alreadyMatched.has(node)) {
      return;
    }

    const name = node.id && astValue.getIdentifierName(node.id);
    const comment = esutil.getAttachedComment(node) ||
        esutil.getAttachedComment(parent) || '';
    this._classFound(name, jsdoc.parseJsdoc(comment), node);
  }

  enterClassDeclaration(node: estree.ClassDeclaration, parent: estree.Node) {
    const name = astValue.getIdentifierName(node.id);
    const comment = esutil.getAttachedComment(node) ||
        esutil.getAttachedComment(parent) || '';
    this._classFound(name, jsdoc.parseJsdoc(comment), node);
  }

  private _classFound(
      name: string|undefined, doc: jsdoc.Annotation, ast: estree.Node) {
    const namespacedName = name && getNamespacedIdentifier(name, doc);

    this.classes.push({name, namespacedName, doc, ast});
    if (ast.type === 'ClassExpression') {
      this.alreadyMatched.add(ast);
    }
  }
}

interface ElementDefineCall {
  tagName: TagNameExpression;
  clazz: ElementClassExpression;
}
type ElementClassExpression = estree.ClassExpression|{
  type: 'MaybeChainedIdentifier';
  name: string, sourceRange: SourceRange
};
class CustomElementsDefineCallFinder implements Visitor {
  readonly warnings: Warning[] = [];
  readonly calls: ElementDefineCall[] = [];
  private readonly _document: JavaScriptDocument;
  constructor(document: JavaScriptDocument) {
    this._document = document;
  }
  enterCallExpression(node: estree.CallExpression) {
    const callee = astValue.getIdentifierName(node.callee);
    if (!(callee === 'window.customElements.define' ||
          callee === 'customElements.define')) {
      return;
    }

    const tagNameExpression =
        node.arguments[0] && this._getTagNameExpression(node.arguments[0]);
    if (tagNameExpression == null) {
      return;
    }
    const elementClassExpression =
        node.arguments[1] && this._getElementClassExpression(node.arguments[1]);
    if (!elementClassExpression) {
      return;
    }
    this.calls.push(
        {tagName: tagNameExpression, clazz: elementClassExpression});
  }

  private _getTagNameExpression(expression: estree.Node): TagNameExpression
      |undefined {
    const tryForLiteralString = astValue.expressionToValue(expression);
    if (tryForLiteralString != null &&
        typeof tryForLiteralString === 'string') {
      return {
        type: 'string-literal',
        value: tryForLiteralString,
        sourceRange: this._document.sourceRangeForNode(expression)!
      };
    }
    if (expression.type === 'MemberExpression') {
      // Might be something like MyElement.is
      const isPropertyNameIs = (expression.property.type === 'Identifier' &&
                                expression.property.name === 'is') ||
          (astValue.expressionToValue(expression.property) === 'is');
      const className = astValue.getIdentifierName(expression.object);
      if (isPropertyNameIs && className) {
        return {
          type: 'is',
          className,
          classNameSourceRange:
              this._document.sourceRangeForNode(expression.object)!
        };
      }
    }
    this.warnings.push({
      code: 'cant-determine-element-tagname',
      message:
          `Unable to evaluate this expression down to a definitive string ` +
          `tagname.`,
      severity: Severity.WARNING,
      sourceRange: this._document.sourceRangeForNode(expression)!
    });
    return undefined;
  }

  private _getElementClassExpression(elementDefn: estree.Node):
      ElementClassExpression|null {
    const className = astValue.getIdentifierName(elementDefn);
    if (className) {
      return {
        type: 'MaybeChainedIdentifier',
        name: className,
        sourceRange: this._document.sourceRangeForNode(elementDefn)!
      };
    }
    if (elementDefn.type === 'ClassExpression') {
      return elementDefn;
    }
    this.warnings.push({
      code: 'cant-determine-element-class',
      message: `Unable to evaluate this expression down to a class reference.`,
      severity: Severity.WARNING,
      sourceRange: this._document.sourceRangeForNode(elementDefn)!
    });
    return null;
  }
}
