/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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

/**
 * Resolves requests from in-memory storage before falling back to another
 * loader.
 */
export class OverlayUrlLoader implements UrlLoader {

  private _fallback: UrlLoader;
  private _files = new Map<string, string>();
  
  constructor(fallback: UrlLoader) {
    this._fallback = fallback;
  }

  canLoad(url: string): boolean {
    return this._files.has(url) || this._fallback.canLoad(url);
  }

  load(url: string): Promise<string> {
    return this._files.has(url)
      ? Promise.resolve(this._files.get(url))
      : this._fallback.load(url);
  }

  setContents(url: string, contents: string) {
    this._files.set(url, contents);
  }

  removeFile(url: string) {
    this._files.delete(url);
  }

}
