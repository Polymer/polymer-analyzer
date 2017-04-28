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

import * as dom5 from 'dom5';
import * as estree from 'estree';

import {ImmutableArray} from '../model/immutable';
import {Class, Document, ElementBase, LiteralValue} from '../model/model';

import {ScannedBehaviorAssignment} from './behavior';
import {JavascriptDatabindingExpression} from './expression-scanner';
import {getBehaviors, Observer, PolymerProperty, ScannedPolymerElement} from './polymer-element';

export type Constructor<T> = new (...args: any[]) => T;
export function PolymerExt<S extends Constructor<ElementBase>>(superClass: S):
    Constructor<PolymerExtension>&S {
  class PolymerExt extends superClass {
    readonly properties: PolymerProperty[];
    readonly observers: ImmutableArray<Observer>;
    readonly listeners: ImmutableArray<{event: string, handler: string}>;
    readonly behaviorAssignments: ImmutableArray<ScannedBehaviorAssignment>;
    readonly scriptElement?: dom5.Node;

    constructor(...args: any[]) {
      const options: {
        observers: Observer[],
        listeners: {event: string, handler: string}[],
        behaviorAssignments: ScannedBehaviorAssignment[],
        scriptElement?: dom5.Node;
      } = args[0];
      const document: Document = args[1];
      super(options, document);
      this.observers = Array.from(options.observers);
      this.listeners = Array.from(options.listeners);
      this.behaviorAssignments = Array.from(options.behaviorAssignments);
      this.scriptElement = options.scriptElement;
    }

    emitPropertyMetadata(property: PolymerProperty) {
      const polymerMetadata:
          {notify?: boolean, observer?: string, readOnly?: boolean} = {};
      const polymerMetadataFields: Array<keyof typeof polymerMetadata> =
          ['notify', 'observer', 'readOnly'];
      for (const field of polymerMetadataFields) {
        if (field in property) {
          polymerMetadata[field] = property[field];
        }
      }
      return {polymer: polymerMetadata};
    }

    protected _getSuperclassAndMixins(
        document: Document, init: ScannedPolymerElement): Class[] {
      const superClassesAndMixins =
          super._getSuperclassAndMixins(document, init);

      const {warnings, behaviors} =
          getBehaviors(init.behaviorAssignments, document);
      this.warnings.push(...warnings);
      superClassesAndMixins.push(...behaviors);
      return superClassesAndMixins;
    }
  };
  return PolymerExt;
};

export interface PolymerExtension {
  properties: PolymerProperty[];

  observers: ImmutableArray < {
    javascriptNode: estree.Expression|estree.SpreadElement,
        expression: LiteralValue,
        parsedExpression: JavascriptDatabindingExpression|undefined;
  }
  > ;
  listeners: ImmutableArray<{event: string, handler: string}>;
  behaviorAssignments: ImmutableArray<ScannedBehaviorAssignment>;
  scriptElement?: dom5.Node;
}
