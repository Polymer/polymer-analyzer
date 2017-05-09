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

import * as chalk from 'chalk';
import {ParsedDocument} from '../parser/document';

import {SourceRange} from './source-range';

export interface WarningInit {
  readonly message: string;
  readonly sourceRange: SourceRange;
  readonly severity: Severity;
  readonly code: string;
  readonly parsedDocument: ParsedDocument<any, any>|null;
}
export class Warning {
  readonly code: string;
  readonly message: string;
  readonly sourceRange: SourceRange;
  readonly severity: Severity;

  private readonly _parsedDocument: ParsedDocument<any, any>|null;

  // Useful while we migrate from object literal warnings to a warning class.
  protected _warningBrand: never;

  constructor(init: WarningInit) {
    ({
      message: this.message,
      sourceRange: this.sourceRange,
      severity: this.severity,
      code: this.code,
      parsedDocument: this._parsedDocument,
    } = init);
  }

  private _getRelavantSourceCode(relativeRange: SourceRange): string|undefined {
    if (this._parsedDocument === null) {
      return;
    }
    const startOffset = this._parsedDocument.sourcePositionToOffset(
        {column: 0, line: relativeRange.start.line});
    const endOffset = this._parsedDocument.sourcePositionToOffset(
        {column: 0, line: relativeRange.end.line + 1});
    return this._parsedDocument.contents.slice(startOffset, endOffset);
  }

  private _getUnderlinedText(
      colorize: (s: string) => string, relativeRange: SourceRange): string
      |undefined {
    const code = this._getRelavantSourceCode(relativeRange);
    if (!code) {
      return undefined;
    }
    const outputLines: string[] = [];
    const lines = code.split('\n');
    let lineNum = relativeRange.start.line;
    for (const line of lines) {
      outputLines.push(line);
      outputLines.push(
          colorize(getSquiggleUnderline(line, lineNum, relativeRange)));
      lineNum++;
    }
    return outputLines.join('\n');
  }

  private _severityToColorFunction(severity: Severity) {
    switch (severity) {
      case Severity.ERROR:
        return chalk.red;
      case Severity.WARNING:
        return chalk.yellow;
      case Severity.INFO:
        return chalk.green;
      default:
        const never: never = severity;
        throw new Error(
            `Unknown severity value - ${never}` +
            ` - encountered while printing warning.`);
    }
  }

  toString(options: Partial<WarningStringifyOptions> = {}): string {
    const opts:
        WarningStringifyOptions = {...defaultPrinterOptions, ...options};
    const colorize = opts.color ? this._severityToColorFunction(this.severity) :
                                  (s: string) => s;
    const severity = this._severityToString(colorize);

    if (!this.sourceRange || !this._parsedDocument) {
      return `INTERNAL ERROR: Tried to print a '${this.code}' ` +
          `warning without a source range and/or parsed document. ` +
          `Please report this!\n` +
          `     https://github.com/Polymer/polymer-analyzer/issues/new\n` +
          `${this._severityToString(colorize)} ` +
          `[${this.code}] - ${this.message}\n`;
    }
    const relativeRange =
        this._parsedDocument.absoluteToRelativeSourceRange(this.sourceRange);
    let result = '';
    if (options.verbosity === 'full') {
      const underlined = this._getUnderlinedText(colorize, relativeRange);
      if (underlined) {
        result += underlined;
      }
    }

    result +=
        (`${this.sourceRange.file}` +
         `(${this.sourceRange.start.line},${this.sourceRange.start.column}) ` +
         `${severity} [${this.code}] - ${this.message}\n`);

    return result;
  }

  private _severityToString(colorize: (s: string) => string) {
    switch (this.severity) {
      case Severity.ERROR:
        return colorize('error');
      case Severity.WARNING:
        return colorize('warning');
      case Severity.INFO:
        return colorize('info');
      default:
        const never: never = this.severity;
        throw new Error(
            `Unknown severity value - ${never} - ` +
            `encountered while printing warning.`);
    }
  }

  toJson() {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      sourceRange: this.sourceRange,
    };
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

function getSquiggleUnderline(
    lineText: string, lineNum: number, sourceRange: SourceRange) {
  // We're on a middle line of a multiline range. Squiggle the entire line.
  if (lineNum !== sourceRange.start.line && lineNum !== sourceRange.end.line) {
    return '~'.repeat(lineText.length);
  }
  // The tricky case. Might be the start of a multiline range, or it might just
  // be a one-line range.
  if (lineNum === sourceRange.start.line) {
    const startColumn = sourceRange.start.column;
    const endColumn = sourceRange.end.line === sourceRange.start.line ?
        sourceRange.end.column :
        lineText.length;
    const prefix = lineText.slice(0, startColumn).replace(/[^\t]/g, ' ');
    if (startColumn === endColumn) {
      return prefix + '~';  // always draw at least one squiggle
    }
    return prefix + '~'.repeat(endColumn - startColumn);
  }

  // We're on the end line of a multiline range. Just squiggle up to the end
  // column.
  return '~'.repeat(sourceRange.end.column);
}

export type Verbosity = 'one-line' | 'full';

export interface WarningStringifyOptions {
  readonly verbosity: Verbosity;
  readonly color: boolean;
}
const defaultPrinterOptions = {
  verbosity: 'full' as 'full',
  color: true
};
