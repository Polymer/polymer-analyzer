/** @global */
function noReturn() {
}

/** @global */
function returnWithNoArgument() {
  return;
}

/** @global */
function returnValue() {
  return 'foo';
}

/** @global */
function mixedReturnStyle() {
  if (something) {
    return;
  } else {
    return 'foo';
  }
}

/** @global */
async function isAsync() {
}

/** @global */
function* isGenerator() {
}

/**
 * @global
 * @return {string}
 */
function annotationOverride() {
}
