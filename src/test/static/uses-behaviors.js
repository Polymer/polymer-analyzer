import {ArrayOfBehaviors, BasicBehavior1, BasicBehavior2 } from './exported-behaviors.js';


Polymer({ behaviors: [BasicBehavior1], is: 'uses-basic-behavior' });

Polymer({ behaviors: [ArrayOfBehaviors], is: 'uses-array-behavior' });
