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

import {Annotation} from '../javascript/jsdoc';

import {Document} from './document';
import {Feature, ScannedFeature} from './feature';
import {ImmutableArray, unsafeAsMutable} from './immutable';
import {Resolvable} from './resolvable';
import {SourceRange} from './source-range';
import {Warning} from './warning';


export class ScannedPolymerLintDirective extends ScannedFeature implements
    Resolvable {
  readonly identifier: string;
  readonly args: string[];
  readonly sourceRange: SourceRange;

  constructor(
      identifier: string, args: string[], sourceRange: SourceRange,
      astNode?: any, description?: string, jsdoc?: Annotation,
      warnings?: Warning[]) {
    super(sourceRange, astNode, description, jsdoc, warnings);
    this.identifier = identifier;
    this.args = args;
  }

  resolve(_document: Document): PolymerLintDirective {
    return new PolymerLintDirective(
        this.identifier,
        this.args,
        this.sourceRange,
        this.astNode,
        this.warnings);
  }
}

declare module './queryable' {
  interface FeatureKindMap {
    'directive': PolymerLintDirective;
  }
}

export class PolymerLintDirective extends Feature {
  readonly args: string[];
  readonly sourceRange: SourceRange;

  constructor(
      identifier: string, args: string[], sourceRange: SourceRange,
      astNode: any, warnings: ImmutableArray<Warning>) {
    super(sourceRange, astNode, warnings);
    unsafeAsMutable(this.kinds).add('directive');
    unsafeAsMutable(this.identifiers).add(identifier);
    this.args = args;
  }
}
