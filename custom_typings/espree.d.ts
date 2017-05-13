declare module 'espree' {
  import * as estree from 'estree';

  /*
   * NOTE(fks) 04-27-2017: When the ParseOpts `comments` option is set to
   * `true`, `espree.parse()` returns an estree Program object with an added
   * "comments" array. This array contains CommentNode objects that contain the
   * information of both the Comment & BaseNode estree type definitions. See:
   * https://github.com/eslint/espree/blob/628cf3a1006b6d8bbc47c25438521b1d57c10371/espree.js#L617
   */
  interface CommentNode extends estree.Comment {
    type: 'Block'|'Line';
    value: string;
    start: number;
    end: number;
    range: [number, number];
    loc: estree.SourceLocation;
  }
  interface Program extends estree.Program {
    comments?: CommentNode[];
  }

  interface ParseOpts {
    attachComment: boolean;
    comment: boolean;
    loc: boolean;
    ecmaVersion?: number;
    ecmaFeatures?: {
      arrowFunctions: boolean; blockBindings: boolean; regexYFlag: boolean;
      destructuring: boolean;
      regexUFlag: boolean;
      templateStrings: boolean;
      binaryLiterals: boolean;
      unicodeCodePointEscapes: boolean;
      defaultParams: boolean;
      restParams: boolean;
      forOf: boolean;
      objectLiteralComputedProperties: boolean;
      objectLiteralShorthandMethods: boolean;
      objectLiteralShorthandProperties: boolean;
      objectLiteralDuplicateProperties: boolean;
      generators: boolean;
      spread: boolean;
      classes: boolean;
      modules: boolean;
      jsx: boolean;
      globalReturn: boolean;
    };
    sourceType: 'script'|'module';
  }
  export function parse(text: string, opts?: ParseOpts): Program;
}
