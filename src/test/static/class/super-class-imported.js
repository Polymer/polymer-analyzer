import { ExportedClass as Super1, ExportedConstClass as Super3 } from './class-names.js';
import Super2 from './class-names.js';
import {ReexportedClass as Super1Again} from './reexported-classes.js';

class CL1 extends Super1 { };

class CL2 extends Super2 { };

class CL3 extends Super3 { };

class CL4 extends Super1Again { };
