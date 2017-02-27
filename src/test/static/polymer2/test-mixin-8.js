/**
 * @polymerMixin
 * @memberof Polymer
 */
Polymer.TestMixin = (superclass) => class extends superclass {
  static get config() {
    return {
      properties: {
        foo: {
          notify: true,
          type: String,
        }
      },
    };
  }
}
