
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

import {Behavior} from '../polymer/behavior';
import {DomModule} from '../polymer/dom-module-scanner';
import {PolymerElement} from '../polymer/polymer-element';

import {Document} from './document';
import {Element} from './element';
import {ElementReference} from './element-reference';
import {Import} from './import';

// A map between kind string literal types and their feature types.
export interface FeatureKinds {
  'document': Document;
  'element': Element;
  'polymer-element': PolymerElement;
  'behavior': Behavior;
  'dom-module': DomModule;
  'element-reference': ElementReference;
  'import': Import;

  // Document specializations.
  'html-document': Document;
  'js-document': Document;
  'json-document': Document;
  'css-document': Document;

  // Import specializations.
  'html-import': Import;
  'html-script': Import;
  'html-style': Import;
  'js-import': Import;
}
