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

import * as babel from 'babel-types';
import * as doctrine from 'doctrine';

import {closureType, configurationProperties, getAttachedComment, getOrInferPrivacy, objectKeyToString} from '../javascript/esutil';
import * as jsdoc from '../javascript/jsdoc';
import {Severity, SourceRange, Warning} from '../model/model';
import {ParsedDocument} from '../parser/document';

import {ScannedPolymerProperty} from './polymer-element';

/**
 * Create a ScannedProperty object from an estree Property AST node.
 */
export function toScannedPolymerProperty(
    node: babel.ObjectMethod|babel.ObjectProperty|babel.ClassMethod,
    sourceRange: SourceRange,
    document: ParsedDocument): ScannedPolymerProperty {
  const parsedJsdoc = jsdoc.parseJsdoc(getAttachedComment(node) || '');
  const description = parsedJsdoc.description.trim();
  const maybeName = objectKeyToString(node.key);

  const warnings: Warning[] = [];
  if (!maybeName) {
    warnings.push(new Warning({
      code: 'unknown-prop-name',
      message:
          `Could not determine name of property from expression of type: ` +
          `${node.key.type}`,
      sourceRange: sourceRange,
      severity: Severity.WARNING,
      parsedDocument: document
    }));
  }

  let value;
  if (babel.isClassMethod(node)) {
    value = node;
  } else {
    value = node.value;
  }

  // TODO(usergenic): Type-checker says node.value may be undefined.  Can we
  // handle this case?
  let type;
  if (value) {
    type = closureType(value, sourceRange, document);
  } else {
    type = new Warning({
      code: 'unknown-prop-type',
      message:
          `Could not determine type of property from expression of type: ` +
          `${node.key.type}`,
      sourceRange: sourceRange,
      severity: Severity.INFO,
      parsedDocument: document
    });
  }
  const typeTag = jsdoc.getTag(parsedJsdoc, 'type');
  if (typeTag) {
    type = doctrine.type.stringify(typeTag.type!) || type;
  }
  if (type instanceof Warning) {
    warnings.push(type);
    type = 'Object';
  }
  const name = maybeName || '';
  const result: ScannedPolymerProperty = {
    name,
    type,
    description,
    sourceRange,
    warnings,
    astNode: node,
    isConfiguration: configurationProperties.has(name),
    jsdoc: parsedJsdoc,
    privacy: getOrInferPrivacy(name, parsedJsdoc)
  };

  return result;
};
