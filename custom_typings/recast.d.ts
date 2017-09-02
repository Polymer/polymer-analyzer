declare module 'recast' {
  import * as estree from 'estree';

  export interface File {
    name: string;
    program: estree.Program;
  }

  export interface Options {
    quote?: 'single'|'double'|'auto';
    wrapColumn?: number;
    tabWidth?: number;
  }

  export interface ParseOptions {
    parser?: {parse(code: string): any}, tabWidth?: number, useTabs?: boolean,
        reuseWhitespace?: boolean, lineTerminator?: string, wrapColumn?: number,
        sourceFileName?: string, sourceMapName?: string, sourceRoot?: string,
        inputSourceMap?: string, range?: boolean, tolerant?: boolean,
        quote?: 'single'|'double'|'auto', trailingComma?: boolean|{
          objects?: boolean,
          arrays?: boolean,
          parameters?: boolean,
        },
        arrayBracketSpacing?: boolean, objectCurlySpacing?: boolean,
        arrowParensAlways?: boolean, flowObjectCommas?: boolean,
  }

  export function parse(source: string, options?: ParseOptions): File;

  export function print(node: estree.Node, options?: Options): {code: string};
}
