export class MultiMap<K, V> extends Map<K, Set<V>> {

  static from<K, V>(values: Iterable<V>, getKey: (value: V) => K): MultiMap<K, V> {
    const multimap = new MultiMap<K, V>();
    multimap.addWithKeys(values, getKey);
    return multimap;
  }

  add(key: K, value: V): Set<V> {
    let set = this.get(key);
    if (!set) {
      set = new Set();
      this.set(key, set);
    }
    set.add(value);
    return set;
  }

  addAll(key: K, values: Iterable<V>): Set<V> {
    let set = this.get(key);
    if (!set) {
      set = new Set();
      this.set(key, set);
    }
    for (const value of values) {
      set.add(value);
    }
    return set;
  }

  addWithKeys(values: Iterable<V>, getKey: (value: V) => K): this {
    for (const value of values) {
      const key = getKey(value);
      this.add(key, value);
    }
    return this;
  }

  clearKey(key: K): void {
    let set = this.get(key);
    if (set) {
      set.clear();
    }
  }
}
