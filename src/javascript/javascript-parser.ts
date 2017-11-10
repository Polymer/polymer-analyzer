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

import * as babel from 'babel-types';
import * as babylon from 'babylon';

import {correctSourceRange, InlineDocInfo, LocationOffset, Severity, SourceRange, Warning, WarningCarryingException} from '../model/model';
import {Parser} from '../parser/parser';

import {JavaScriptDocument} from './javascript-document';

export type SourceType = 'script' | 'module';

declare class SyntaxError {
  message: string;
  lineNumber: number;
  column: number;
}

// TODO(rictic): stop exporting this.
export const baseParseOptions: babylon.BabylonOptions = {
  plugins: [
    'asyncGenerators',
    'dynamicImport',
    // 'importMeta', // not yet in the @types file
    'objectRestSpread',
  ],
  // TODO(usergenic): None of these parsing options are supported by Babylon.
  // Remove them or find out how to get equivalent behavior.
  //  ecmaVersion: 8,
  //  attachComment: true,
  //  comment: true,
  //  loc: true,
};

// TODO(usergenic): Move this to regular baseParseOptions declaration once
// @types/babylon has been updated to include `ranges`.
(baseParseOptions as any)['ranges'] = true;

export class JavaScriptParser implements Parser<JavaScriptDocument> {
  sourceType: SourceType;

  parse(contents: string, url: string, inlineInfo?: InlineDocInfo<any>):
      JavaScriptDocument {
    const isInline = !!inlineInfo;
    inlineInfo = inlineInfo || {};
    const result = parseJs(
        contents, url, inlineInfo.locationOffset, undefined, this.sourceType);
    if (result.type === 'failure') {
      // TODO(rictic): define and return a ParseResult instead of throwing.
      const minimalDocument = new JavaScriptDocument({
        url,
        contents,
        ast: null as any,
        locationOffset: inlineInfo.locationOffset,
        astNode: inlineInfo.astNode, isInline,
        parsedAsSourceType: 'script',
      });
      throw new WarningCarryingException(
          new Warning({parsedDocument: minimalDocument, ...result.warning}));
    }

    return new JavaScriptDocument({
      url,
      contents,
      ast: result.program,
      locationOffset: inlineInfo.locationOffset,
      astNode: inlineInfo.astNode, isInline,
      parsedAsSourceType: result.sourceType,
    });
  }
}

export class JavaScriptModuleParser extends JavaScriptParser {
  sourceType: SourceType = 'module';
}

export class JavaScriptScriptParser extends JavaScriptParser {
  sourceType: SourceType = 'script';
}

export type ParseResult = {
  type: 'success',
  sourceType: SourceType,
  program: babel.Program,
} | {
  type: 'failure',
  warning: {
    sourceRange: SourceRange,
    severity: Severity,
    code: string,
    message: string,
  }
};

/**
 * Parse the given contents and return either an AST or a parse error as a
 * Warning. It needs the filename and the location offset to produce correct
 * warnings.
 */
export function parseJs(
    contents: string,
    file: string,
    locationOffset?: LocationOffset,
    warningCode?: string,
    sourceType?: SourceType): ParseResult {
  if (!warningCode) {
    warningCode = 'parse-error';
  }

  let program: babel.Program;
  const parseOptions = {sourceFilename: file, ...baseParseOptions};

  try {
    // If sourceType is not provided, we will try script first and if that
    // fails, we will try module, since failure is probably that it can't
    // parse the 'import' or 'export' syntax as a script.
    if (!sourceType) {
      try {
        sourceType = 'script';
        program =
            babylon.parse(contents, {sourceType, ...parseOptions}).program;
      } catch (_ignored) {
        sourceType = 'module';
        program =
            babylon.parse(contents, {sourceType, ...parseOptions}).program;
      }
    } else {
      program = babylon.parse(contents, {sourceType, ...parseOptions}).program;
    }
    return {
      type: 'success',
      sourceType: sourceType,
      program: program,
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return {
        type: 'failure',
        warning: {
          message: err.message.split('\n')[0],
          severity: Severity.ERROR,
          code: warningCode,
          sourceRange: correctSourceRange(
              {
                file,
                start: {line: err.lineNumber - 1, column: err.column - 1},
                end: {line: err.lineNumber - 1, column: err.column - 1}
              },
              locationOffset)!
        }
      };
    }
    throw err;
  }
}
