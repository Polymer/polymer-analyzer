
class TestElement extends Polymer.Element {
  static get properties() {
    return {
      parseError: {
        computed: 'let let let',
        observer: 'let let let',
      },
      badKindOfExpression: {
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
    ];
  }
}

window.customElements.define('test-element', TestElement);
