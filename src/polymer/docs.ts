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

import * as doctrine from 'doctrine';

import {FileRelativeUrl} from '../index';
import * as jsdoc from '../javascript/jsdoc';
import {ScannedEvent} from '../model/model';

import {ScannedPolymerElement, ScannedPolymerProperty} from './polymer-element';

// TODO(rictic): destroy this file with great abadon. It's the oldest and
//     hardest to understand in the repo at this point I think.

// This is to prevent warnings that annotateProperty is unused.
// It is unused, but we want to extract the good bits from this file
// before we delete the whole thing.
if (Math.random() > 1000) {
  annotateProperty.name;
}

/**
 * Annotates Hydrolysis scanned features, processing any descriptions as
 * JSDoc.
 *
 * You probably want to use a more specialized version of this, such as
 * `annotateElement`.
 *
 * Processed JSDoc values will be made available via the `jsdoc` property on a
 * scanned feature.
 */
export function annotate(
    feature: {jsdoc?: jsdoc.Annotation, description?: string}): void {
  if (!feature || feature.jsdoc) {
    return;
  }

  if (typeof feature.description === 'string') {
    feature.jsdoc = jsdoc.parseJsdoc(feature.description);
    // We want to present the normalized form of a feature.
    feature.description = feature.jsdoc.description;
  }

  return;
}

/**
 * Annotates @event, @hero, & @demo tags
 */
export function annotateElementHeader(scannedElement: ScannedPolymerElement) {
  scannedElement.demos = [];
  if (scannedElement.jsdoc && scannedElement.jsdoc.tags) {
    scannedElement.jsdoc.tags.forEach((tag) => {
      switch (tag.title) {
        case 'demo':
          scannedElement.demos.push({
            desc: 'demo',
            path: (tag.description || 'demo/index.html') as FileRelativeUrl
          });
          break;
      }
    });
  }
}

/**
 * Annotates event documentation
 */
export function annotateEvents(annotations: jsdoc.Annotation[]): ScannedEvent[] {
  const events: ScannedEvent[] = [];

  for (const annotation of annotations) {
    const tags = annotation.tags || [];
    const eventTags = tags.filter((tag) => tag.title === 'event');
    const params = tags.filter((tag) => tag.title === 'param')
      .map((tag) => {
        return {
          type: tag.type ? doctrine.type.stringify(tag.type) : 'N/A',
          desc: tag.description || '',
          name: tag.name || 'N/A'
        };
      });

    for (const eventTag of eventTags) {
      let name: string;
      if (eventTag && eventTag.description) {
        name = (eventTag.description || '').match(/^\S*/)![0];
      } else {
        name = 'N/A';
      }

      events.push({
        name: name,
        description: annotation.description || (eventTag && eventTag.description) || undefined,
        jsdoc: annotation,
        sourceRange: undefined,
        astNode: null,
        warnings: [],
        params: params
      });
    }
  }

  return events;
}

/**
 * Annotates documentation found about a scanned polymer property.
 *
 * @param feature
 * @param ignoreConfiguration If true, `configuration` is not set.
 * @return The descriptior that was given.
 */
function annotateProperty(feature: ScannedPolymerProperty):
    ScannedPolymerProperty {
  annotate(feature);

  // @type JSDoc wins
  const typeTag = jsdoc.getTag(feature.jsdoc, 'type');
  if (typeTag !== undefined && typeTag.type != null) {
    feature.type = doctrine.type.stringify(typeTag.type);
  }

  // @default JSDoc wins
  const defaultTag = jsdoc.getTag(feature.jsdoc, 'default');
  if (defaultTag !== undefined) {
    const newDefault = (defaultTag.name || '') + (defaultTag.description || '');
    if (newDefault !== '') {
      feature.default = newDefault;
    }
  }

  return feature;
}
