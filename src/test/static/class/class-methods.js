class Class {
  static get customClassGetter() {
    return 1;
  }

  get customInstanceGetter() {
    return 2;
  }

  static customClassFunction() {
    return 3;
  }

  customInstanceFunction() {
    return 4;
  }

  customInstanceFunctionWithNoReturn() {
  }

  customInstanceFunctionWithInferredReturn() {
    return 4.1;
  }

  customInstanceFunctionWithInferredMultipleReturn() {
    if (window.foo) {
      return 4.2;
    } else {
      return true;
    }
  }

  customInstanceFunctionWithUninferrableReturn() {
    if (window.foo) {
      return 4.3;
    } else {
      return (window.bar ? new Set() : new Map());
    }
  }

  /**
   * This is the description for customInstanceFunctionWithJSDoc.
   * @return {Number} - The number 5, always.
   */
  customInstanceFunctionWithJSDoc() {
    return 5;
  }

  customInstanceFunctionWithParams(a, b, c) {
    return 6;
  }

  /**
   * This is the description for customInstanceFunctionWithParamsAndJSDoc.
   * @param {Number} a The first argument
   * @param {Number} b
   * @param {Number} c The third argument
   * @returns {Number} - The number 7, always.
   */
  customInstanceFunctionWithParamsAndJSDoc(a, b, c) {
    return 7;
  }

  /**
   * This is the description for
   * customInstanceFunctionWithParamsAndPrivateJSDoc.
   * @private
   */
  customInstanceFunctionWithParamsAndPrivateJSDoc() {
    return 8;
  }

  /**
   * This is the description for customInstanceFunctionWithRestParam.
   * @param {Number} a The first argument.
   * @param {...Number} b The second argument.
   * @returns {Number} - The number 9, always.
   */
  customInstanceFunctionWithRestParam(a, ...b) {
    return 9;
  }

  /**
   * This is the description for customInstanceFunctionWithParamDefault.
   * @param {Number} a The first argument.
   * @param {Number} b The second argument.
   * @returns {Number} - The number 10, always.
   */
  customInstanceFunctionWithParamDefault(a, b = 0) {
    return 10;
  }
}
