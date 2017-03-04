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

import {Document} from './document';
import {Feature, ScannedFeature} from './feature';
import {Resolvable} from './resolvable';
import {SourceRange} from './source-range';

export interface Warning {
  message: string;
  sourceRange: SourceRange;
  severity: Severity;
  code: string;
}

export enum Severity {
  ERROR,
  WARNING,
  INFO
}

// TODO(rictic): can we get rid of this class entirely?
export class WarningCarryingException extends Error {
  warning: Warning;
  constructor(warning: Warning) {
    super(warning.message);
    this.warning = warning;
  }
}

const emptySet = new Set();
/**
 * Used for passing along a Warning discovered while scanning that can't be
 * placed on a complete feature.
 */
export class IncompleteFeature implements ScannedFeature, Feature, Resolvable {
  readonly warning: Warning;

  // No kinds or identifiers as we only want people to find these warnings by
  // calling getWarnings on documents/packages.
  readonly kinds: Set<string> = emptySet;
  readonly identifiers: Set<string> = emptySet;

  readonly description: undefined = undefined;
  readonly jsdoc: undefined = undefined;
  readonly astNode: undefined = undefined;

  constructor(warning: Warning) {
    this.warning = warning;
  }

  get sourceRange() {
    return this.warning.sourceRange;
  }
  get warnings() {
    return [this.warning];
  }
  resolve(_document: Document) {
    return this;
  }
}
