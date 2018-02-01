
class TestElement extends Polymer.Element {
  static get properties() {
    return {
      parseError: {
        type: String,
        computed: 'let let let',
        observer: 'let let let',
      },
      badKindOfExpression: {
        type: String,
        computed: 'foo',
        observer: 'foo(bar, baz)'
      }
    }
  }
  static get observers() {
    return [
      'let let let parseError',
      'foo',
      'foo(bar)',
      'im not' + function anObserver() {}
    ];
  }
}

window.customElements.define('test-element', TestElement);
