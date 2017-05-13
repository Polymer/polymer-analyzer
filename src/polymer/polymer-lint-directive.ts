
/**
 * Polymer-Lint Directive Matcher:
 * `^\s` Matches all whitespace from the start of the comment to "polymer-lint".
 * `(enable|disable)` Captures the first argument: enable or disable.
 * `[:| ]*` Colon is optional formatting.
 * (.*) Capture any arguments in a single string, if provided.
 */
const directiveMatcher = /^\s*polymer-lint (enable|disable)[:| ]*(.*)/;

/**
 * Denote the matchDirective() return type as a special kind of
 * RegExpMatchArray.
 */
export interface DirectiveMatchArray extends RegExpMatchArray {}
;

/**
 * Given some string, check it for a polymer-lint directive and return the match
 * result.
 */
export function matchDirective(str: string): DirectiveMatchArray|null {
  return str.match(directiveMatcher);
}

/**
 * Given a DirectiveMatchArray, return an array of parsed arguments for the
 * directive.
 */
export function parseDirectiveArgs(directiveMatch: DirectiveMatchArray):
    string[] {
  const directiveCommand: string = directiveMatch[1];
  const directiveArgString: string = directiveMatch[2];
  const directiveArgs = (directiveArgString.length > 0) ?
      directiveArgString.split(',').map((rule) => rule.trim()) :
      [];
  return [directiveCommand, ...directiveArgs];
}
