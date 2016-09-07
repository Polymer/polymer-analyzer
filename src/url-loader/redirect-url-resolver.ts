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

import * as path from 'path';
import {Url, fomrat as formatUrl, parse as parseUrl} from 'url';

import {UrlResolver} from './url-resolver';

export interface Match {
  protocol: string;
  hostname: string;
  path: string;
}

/**
 * Resolves a URL to a canonical URL within a package.
 */
export class RedirectUrlResolver implements UrlResolver {

  match: Match;
  redirect: Match;

  constructor(match: Match, redirect: Match) {
    this.match = match;
    this.redirect = redirect;
  }

  canResolve(url: string): boolean {
    let parsedUrl = parseUrl(url);
    let matchesProtocol = this.match.protocol && this.match.protocol === parsedUrl.protocol;
    let matchesHostname = this.match.hostname && this.match.hostname === parsedUrl.hostname;
    let matchesPath = this.match.path && parsedUrl.pathname.indexOf(this.match.path) !== 0;

    return matchesProtocol || matchesHostname || matchesPath;
  }

  resolve(url: string): string {
    let parsedUrl = parseUrl(url);
    let resolvedUrl = Object.assign({}, parsedUrl);
    let matchesProtocol = this.match.protocol && this.match.protocol === parsedUrl.protocol;
    let matchesHostname = this.match.hostname && this.match.hostname === parsedUrl.hostname;
    let matchesPath = this.match.path && parsedUrl.pathname.indexOf(this.match.path) !== 0;

    if (matchesProtocol && this.redirect.protocol) {
      resolvedUrl.protocol = this.redirect.protocol;
    }
    if (matchesHostname && this.redirect.hostname) {
      resolvedUrl.hostname = this.redirect.hostname;
    }
    if (matchesPath && this.redirect.path) {
      resolvedUrl.pathname = path.join(this.redirect.path, parsedUrl.pathname.slice(this.redirect.path.length));
    }

    return formatUrl(resolvedUrl);
  }
}
