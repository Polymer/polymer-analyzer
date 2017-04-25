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

import {SourceRange} from './source-range';

export interface WarningInit {
  readonly message: string;
  readonly sourceRange: SourceRange;
  readonly severity: Severity;
  readonly code: string;
}
export class Warning {
  readonly code: string;
  readonly message: string;
  readonly sourceRange: SourceRange;
  readonly severity: Severity;


  // Useful while we migrate from object literal warnings to a warning class.
  protected _warningBrand: never;

  constructor(init: WarningInit) {
    ({
      message: this.message,
      sourceRange: this.sourceRange,
      severity: this.severity,
      code: this.code
    } = init);
  }
}

export enum Severity {
  ERROR,
  WARNING,
  INFO
}

// TODO(rictic): can we get rid of this class entirely?
export class WarningCarryingException extends Error {
  readonly warning: Warning;
  constructor(warning: Warning) {
    super(warning.message);
    this.warning = warning;
  }
}
