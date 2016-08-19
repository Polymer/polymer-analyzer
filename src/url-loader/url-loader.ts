
/**
 * An object that reads files.
 */
export abstract class UrlLoader {
  /**
   * Returns `true` if this loader can load the given `url`.
   */
  abstract canLoad(url: string): boolean;

  /**
   * Reads a file from `url`.
   *
   * This should only be called if `canLoad` returns `true` for `url`.
   */
  abstract load(url: string): Promise<string>;

  /**
   * Return true iff the loader is able to list nearby resources and give
   * autocompletion help with a user that's typing out a path.
   *
   * A filesystem loader e.g. can do this pretty easily with fs.listdir, but
   * a loader that fetches remote resouces may not be able to.
   */
  offersCompletions() {
    return false;
  }

  /**
   * Given the partial path (e.g. that a user may be in the process of typing)
   * of `dirname`, return an array of paths that dirname could complete to.
   *
   * `dirname` is a resolved URL relative to the package root.
   */
  async getCompletions(_dirname: string): Promise<string[]> {
    return [];
  }
}
