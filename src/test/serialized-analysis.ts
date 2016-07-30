import {BowerMetadata, Element, SerializedAnalysis} from '../serialized-analysis';


// An example, the correct compilation thereof acts as a test.
const paperButtonElement: Element = {
  path: 'paper-button.html',
  tagname: 'paper-button',
  classname: 'PaperButton',
  superclass: 'HTMLElement',
  demos: ['demo/index.html'],

  attributes: [
    {
      name: 'raised',
      description: 'If true, the button should be styled with a shadow.',
      type: 'boolean',
    },
    {
      name: 'elevation',
      type: 'number',
      description: `
  The z-depth of this element, from 0-5. Setting to 0 will remove the
  shadow, and each increasing number greater than 0 will be "deeper"
  than the last.`.trim()
    },
    {name: 'role', defaultValue: 'button'},
    {name: 'tabindex', defaultValue: '0'},
    {name: 'animated', defaultValue: 'true'}
  ],
  properties: [
    {
      name: 'raised',
      description: 'If true, the button should be styled with a shadow.',
      type: 'boolean',
      defaultValue: 'false',
      metadata: {
        polymer: {reflectToAttribute: true, observer: '_calculateElevation'}
      }
    },
    {
      name: 'elevation',
      type: 'number',
      description: `
  The z-depth of this element, from 0-5. Setting to 0 will remove the
  shadow, and each increasing number greater than 0 will be "deeper"
  than the last.`.trim(),
      defaultValue: '1',
      metadata: {polymer: {reflectToAttribute: true, readOnly: true}}
    }
  ],
  events: [{
    name: 'transitionend',
    type: 'Event',
    description: `
Fired when the animation finishes.
This is useful if you want to wait until
the ripple animation finishes to perform some action.`.trim(),
    detail: {
      properties: [{
        name: 'node',
        description: 'Contains the animated node.',
        type: 'Object'
      }]
    }
  }],
  slots: [{name: '', description: 'The body of the button.'}],
  styling: {
    classes: [],
    cssVariables: [
      {
        name: '--paper-button-ink-color',
        description: 'Background color of the ripple',
        fallbackBehavior: 'Based on the button\'s color'
      },
      {
        name: '--paper-button',
        description: 'Mixin applied to the disabled button. Note that you ' +
            'can also use the `paper-button[disabled]` selector',
        fallbackBehavior: '{}'
      },
      {
        name: '--paper-button-disabled',
        description: '',
        fallbackBehavior: '{}'
      },
      {
        name: '--paper-button-flat-keyboard-focus',
        description: 'Mixin applied to a flat button after ' +
            'it\'s been focused using the keyboard',
        fallbackBehavior: '{}'
      },
      {
        name: '--paper-button-raised-keyboard-focus',
        description: 'Mixin applied to a raised button ' +
            'after it\'s been focused using the keyboard',
        fallbackBehavior: '{}'
      },
      {name: '--layout-inline'},
      {name: '--layout-center-center'},
      {name: '--paper-font-common-base'},
    ],

    needsExplicitSize: false
  },
  metadata: {polymer: {behaviors: ['Polymer.PaperButtonBehavior']}},
  description: `
Material design: [Buttons](https://www.google.com/design/spec/components/buttons.html)

\`paper-button\` is a button. When the user touches the button, a ripple effect emanates
from the point of contact. It may be flat or raised. A raised button is styled with a
shadow.

Example:

    <paper-button>Flat button</paper-button>
    <paper-button raised>Raised button</paper-button>
    <paper-button noink>No ripple effect</paper-button>
    <paper-button toggles>Toggle-able button</paper-button>

A button that has \`toggles\` true will remain \`active\` after being clicked (and
will have an \`active\` attribute set). For more information, see the \`Polymer.IronButtonState\`
behavior.

You may use custom DOM in the button body to create a variety of buttons. For example, to
create a button with an icon and some text:

    <paper-button>
      <iron-icon icon="favorite"></iron-icon>
      custom button content
    </paper-button>

To use \`paper-button\` as a link, wrap it in an anchor tag. Since \`paper-button\` will already
receive focus, you may want to prevent the anchor tag from receiving focus as well by setting
its tabindex to -1.

    <a href="https://www.polymer-project.org/" tabindex="-1">
      <paper-button raised>Polymer Project</paper-button>
    </a>

### Styling

Style the button with CSS as you would a normal DOM element.

    paper-button.fancy {
      background: green;
      color: yellow;
    }

    paper-button.fancy:hover {
      background: lime;
    }

    paper-button[disabled],
    paper-button[toggles][active] {
      background: red;
    }

By default, the ripple is the same color as the foreground at 25% opacity. You may
customize the color using the \`--paper-button-ink-color\` custom property.

The following custom properties and mixins are also available for styling:

Custom property | Description | Default
----------------|-------------|----------
\`--paper-button-ink-color\` | Background color of the ripple | \`Based on the button's color\`
\`--paper-button\` | Mixin applied to the button | \`{}\`
\`--paper-button-disabled\` | Mixin applied to the disabled button. Note that you can also use the \`paper-button[disabled]\` selector | \`{}\`
\`--paper-button-flat-keyboard-focus\` | Mixin applied to a flat button after it's been focused using the keyboard | \`{}\`
\`--paper-button-raised-keyboard-focus\` | Mixin applied to a raised button after it's been focused using the keyboard | \`{}\`

@demo demo/index.html
`.trim()

};

const paperButton: SerializedAnalysis = {
  packages: [{
    name: 'paper-button',
    version: '1.0.12',
    bowerMetadata: <BowerMetadata>{
      'name': 'paper-button',
      'version': '1.0.12',
      'description': 'Material design button',
      'authors': ['The Polymer Authors'],
      'keywords':
          ['web-components', 'web-component', 'polymer', 'paper', 'button'],
      'main': 'paper-button.html',
      'private': true,
      'repository': {
        'type': 'git',
        'url': 'git://github.com/PolymerElements/paper-button.git'
      },
      'license': 'http://polymer.github.io/LICENSE.txt',
      'homepage': 'https://github.com/PolymerElements/paper-button',
      'dependencies': {
        'polymer': 'Polymer/polymer#^1.1.0',
        'iron-flex-layout': 'PolymerElements/iron-flex-layout#^1.0.0',
        'paper-behaviors': 'PolymerElements/paper-behaviors#^1.0.0',
        'paper-material': 'PolymerElements/paper-material#^1.0.0'
      },
      'devDependencies': {
        'iron-component-page': 'PolymerElements/iron-component-page#^1.0.0',
        'iron-demo-helpers': 'PolymerElements/iron-demo-helpers#^1.0.0',
        'iron-icon': 'PolymerElements/iron-icon#^1.0.0',
        'iron-icons': 'PolymerElements/iron-icons#^1.0.0',
        'iron-test-helpers': 'PolymerElements/iron-test-helpers#^1.0.0',
        'paper-styles': 'PolymerElements/paper-styles#^1.0.0',
        'test-fixture': 'PolymerElements/test-fixture#^1.0.0',
        'web-component-tester': '^4.0.0',
        'webcomponentsjs': 'webcomponents/webcomponentsjs#^0.7.0'
      },
      'ignore': []
    },
    elements: [paperButtonElement]
  }],
};
