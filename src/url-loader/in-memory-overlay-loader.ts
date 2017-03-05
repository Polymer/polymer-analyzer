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


/**
 * Resolves requests first from an in-memory map of file contents, and if a
 * file isn't found there, defers to another url loader.
 *
 * Useful for the editor use case. An editor will have a number of files in open
 * buffers at any time. For these files, the editor's in-memory buffer is
 * canonical, so that their contents are read even when they have unsaved
 * changes. For all other files, we can load the files using another loader,
 * e.g. from disk.
 *
 * TODO(rictic): make this a mixin that mixes another loader.
 */
export class InMemoryOverlayLoader implements UrlLoader {
  private readonly _fallbackLoader: UrlLoader;
  private readonly _memoryMap = new Map<string, string>();

  constructor(fallbackLoader: UrlLoader) {
    this._fallbackLoader = fallbackLoader;
    if (this._fallbackLoader.readDirectory) {
      this.readDirectory =
          this._fallbackLoader.readDirectory.bind(this._fallbackLoader);
    }
  }

  canLoad(url: string): boolean {
    if (this._memoryMap.has(url)) {
      return true;
    }
    return this._fallbackLoader.canLoad(url);
  }

  async load(url: string): Promise<string> {
    const contents = this._memoryMap.get(url);
    if (typeof contents === 'string') {
      return contents;
    }
    return this._fallbackLoader.load(url);
  }

  // We have this method if our underlying loader has it.
  readDirectory?: (pathFromRoot: string, deep?: boolean) => Promise<string[]>;

  mapFile(url: string, contents: string) {
    this._memoryMap.set(url, contents);
  }

  unmapFile(url: string) {
    this._memoryMap.delete(url);
  }
}
