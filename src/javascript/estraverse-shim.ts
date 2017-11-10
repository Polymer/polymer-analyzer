import babelTraverse from 'babel-traverse';
import {NodePath} from 'babel-traverse';
import * as babel from 'babel-types';
import {Visitor, VisitResult} from './estree-visitor';

export enum VisitorOption {
  Skip,
  Break,
  Remove,
}

export function traverse(ast: babel.Node, visitor: Visitor): void {
  babelTraverse(ast, {
    enter(path) {
      dispatchVisitMethods(['enter', `enter${path.type}`], path, visitor);
    },

    exit(path) {
      dispatchVisitMethods(['leave', `leave${path.type}`], path, visitor);
    },
    noScope: true,
  });
}

function dispatchVisitMethods(
    methods: string[], path: NodePath<babel.Node>, visitor: Visitor): void {
  for (const method of methods) {
    if (typeof(<any>visitor)[method] === 'function') {
      const result =
          (<any>visitor)[method](path.node, path.parent) as VisitResult;
      switch (result) {
        case VisitorOption.Break:
          return path.stop();
        case VisitorOption.Skip:
          return path.skip();
        case VisitorOption.Remove:
          return path.remove();
      }
    }
  }
}
