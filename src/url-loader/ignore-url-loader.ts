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

import {UrlLoader} from './url-loader';

function isStringMatcher(matcher: any) {
  return typeof matcher === 'string';
}
function isFunctionMatcher(matcher: any) {
  return typeof matcher === 'function';
}
function isRegexMatcher(matcher: any) {
  return matcher instanceof RegExp;
}

function isValidMatcher(matcher: any): boolean {
  return isStringMatcher(matcher)
      || isRegexMatcher(matcher)
      || isFunctionMatcher(matcher);
}

/**
 * Resolves requests via the file system.
 */
export class IgnoreUrlLoader implements UrlLoader {

  matcher: string|RegExp|((str: string) => boolean);

  constructor(match: string|RegExp|((str: string) => boolean)) {
    if (!isValidMatcher(match)) {
      throw new Error('illegal matcher provided');
    }
    this.matcher = match;
  }

  canLoad(url: string): boolean {
    if (isStringMatcher(this.matcher)) {
      return url.search(<string>this.matcher) > -1;
    }
    if (isRegexMatcher(this.matcher)) {
      return (<RegExp>this.matcher).test(url);
    }
    if (isFunctionMatcher(this.matcher)) {
      return (<((str: string) => boolean)>this.matcher)(url);
    }
    throw new Error('somehow no matcher was set');
  }

  load(url: string): Promise<string> {
    return Promise.resolve('');
  }

};
