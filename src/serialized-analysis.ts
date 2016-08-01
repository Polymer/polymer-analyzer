/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * polymer.github.io/PATENTS.txt
 */
// DO NOT SUBMIT without regex-removing the problematic parts of the orignal
// license
// before passing to typson.

export interface SerializedAnalysis {
  // TODO(rictic): once this schema has stabilized, put the json file somewhere
  // and reference it like:
  // $schema: 'http://polymer-project.org/schema/v1/analysis.json';
  packages: Package[];
}

/**
 * The base interface, holding properties common to all nodes.
 */
export interface Node {
  /** Where this feature is defined in source code. */
  sourceLocation?: {
    /** Line number, zero indexed. */
    line: number;
    /** Column number, zero indexed. */
    column: number;
  };

  /**
   * An extension point for framework-specific metadata, as well as any
   * metadata not yet standardized here such as what polyfills are needed,
   * behaviors and mixins used, the framework that the element was written in,
   * tags/categories, links to specs that the element implements, etc.
   *
   * Framework-specific metadata should be put into a sub-object with the name
   * of that framework.
   */
  metadata?: any;
}


export interface Package {
  /** The name of the package, like `paper-button` */
  name?: string;
  /** The version, extracted from package.json, bower.json, etc as available. */
  version?: string;

  /** The npm metadata of the package, if any. */
  npmPackage?: NpmPackage;

  /** The bower metadata of the package, if any. */
  bowerMetadata?: BowerMetadata;

  /** Elements found inside the package. */
  elements: Element[];
}

export interface Element extends Node {
  /**
   * The path, relative to the base directory of the package.
   *
   * e.g. `paper-input.html` or `app-toolbar/app-toolbar.html` (given that
   * app-toolbar lives in the app-layout package).
   */
  path: string;

  /** The tagname that the element registers itself as. e.g. `paper-input` */
  tagname: string;

  /** A markdown description for the element. */
  description: string;

  /**
   * Paths, relative to `this.path` to demo pages for the element.
   *
   * e.g. `['demos/index.html', 'demos/extended.html']`
   */
  demos: string[];

  /**
   * The tagname that the element extends, if any. The value of the `extends`
   * option that's passed into `customElements.define`.
   *
   * e.g. `input`, `paper-button`, `my-super-element`
   */
  extends?: string;

  /**
   * The class name for this element.
   *
   * e.g. `MyElement`, `Polymer.PaperInput`
   */
  classname?: string;

  /**
   * The class that this element extends.
   *
   * This is non-optional, as every custom element must have HTMLElement in
   * its prototype change.
   *
   * e.g. `HTMLElement`, `HTMLInputElement`, `MyNamespace.MyBaseElement`
   */
  superclass: string;

  /** The attributes that this element is known to understand. */
  attributes?: Attribute[];

  /** The properties that this element has. */
  properties?: Property[];

  /** The events that this element fires. */
  events?: Event[];

  /** The shadow dom content slots that this element accepts. */
  slots:
  Slot[];  // this formatting is strange, yes

  /** Information useful for styling the element and its children. */
  styling: {

    /** CSS Classes that produce built-in custom styling for the element. */
    classes: {
      /** The name of the class. e.g. `bright`, `cascade`, `ominous_pulsing` */
      name: string;
      /** A markdown description of the class and what effects it has. */
      description: string;
    }[];

    /** CSS Variables that the element understands. */
    cssVariables: {

      /** The name of the variable. e.g. `--header-color`, `--my-element-size`*/
      name: string;

      /** The type of the variable. Advisory. e.g. `color`, `size` */
      type?: string;

      /** A markdown description of the variable. */
      description?: string;

      /**
       * A markdown description of how the element will fallback if the variable
       * isn't defined.
       */
      fallbackBehavior?: string;
    }[];

    /** If true, the element must be given an explicit size by its context. */
    needsExplicitSize?: boolean;

    // Would be nice to document the default styling a bit here, whether it's
    // display: block or inline or whatever.
  };
}

export interface Attribute extends Node {
  /** The name of the attribute. e.g. `value`, `icon`, `should-collapse`. */
  name: string;

  /** A markdown description for the attribute. */
  description?: string;

  /**
   * The type that the attribute will be serialized/deserialized as.
   *
   * e.g. `string`, `number`, `boolean`, `RegExp`, `Array`, `Object`.
   */
  type?: string;

  /** The default value of the attribute, if any. */
  defaultValue?: string;

  // We need some way of representing that this attribute is associated with a
  // property. TBD.
}

export interface Property extends Node {
  /** The name of the property. e.g. `value`, `icon`, `shouldCollapse`. */
  name: string;

  /** A markdown description of the property. */
  description: string;

  /**
   * The javascript type of the property.
   *
   * There's no standard here. Common choices are closure compiler syntax
   * and typescript syntax.
   */
  type: string;

  /** A string representation of the default value. */
  defaultValue?: string;

  /** Nested subproperties hanging off of this property. */
  properties?: Property[];
}

export interface Event extends Node {
  /** The name of the event. */
  name: string;

  /** A markdown description of the event. */
  description: string;
  /**
   * The type of the event object that's fired.
   *
   * e.g. `Event`, `CustomEvent`, `KeyboardEvent`, `MyCustomEvent`.
   */
  type: string;

  /** Information about the `detail` field of the event. */
  detail?: {properties: Property[]};

  // Should we have a way of associating an event with an attribute or a
  // property?
}

export interface Slot extends Node {
  /** The name of the slot. e.g. `banner`, `body`, `tooltipContents` */
  name: string;

  /** A markdown description of the slot. */
  description: string;

  // Something about fallback perhaps?
}

export interface NpmPackage {
  name: string;
  version: string;
  description?: string;
  // ... etc
}

export interface BowerMetadata {
  name: string;
  version: string;
  description?: string;
  // ... etc
}
