/**
 * Implement AABB collision detection for entities with a mesh.
 * (https://en.wikipedia.org/wiki/Minimum_bounding_box#Axis-aligned_minimum_bounding_box)
 * It sets the specified state on the intersected entities.
 *
 * @property {string} objects - Selector of the entities to test for collision.
 * @property {string} state - State to set on collided entities.
 *
 */
AFRAME.registerComponent(
    'aabb-collider',
    {schema: {objects: {default: ''}, state: {default: 'collided'}}});


/** Bad components: */


AFRAME.registerComponent();
AFRAME.registerComponent('no-definition');
AFRAME.registerComponent('too-many-args', {}, {});

AFRAME.registerComponent(
    Math.random() > 0.5 ? 'not-statically-analyzable' : 'definitely-not', {});

AFRAME.registerComponent(10, {});
