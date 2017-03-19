(() => {
  const pageUtils = module$src$js$util$page;
  const router = module$src$js$router$router;
  const api = module$src$js$api$api;
  const RouteMixin = module$src$js$router$routing_mixin;
  const AnimatedRouteMixin = module$src$js$router$animated_routing_mixin;
  /**
 @constructor
 @extends {Polymer.Element}
 @implements {module$src$js$router$routing_mixin.Type}
 */
const RoutedElement = module$src$js$router$animated_routing_mixin(Polymer.Element, "fadeinup");
  /** @polymerElement */ window.BannowebDashboardElement = class extends RoutedElement {
    static get is() {
      return "bannoweb-dashboard";
    }
    constructor() {
      super();
      const bannowebAccountsCard = /** @type {!window.BannowebAccountsCardElement} */ (this.root.querySelector("bannoweb-accounts-card"));
      bannowebAccountsCard.accountsCollection = module$src$js$api$api.store.accounts;
      bannowebAccountsCard.accountsController = module$src$js$api$api.accountsController;
      bannowebAccountsCard.institution = module$src$js$api$api.store.institution;
      const bannowebActivityCard = /** @type {!window.BannowebActivityCardElement} */ (this.root.querySelector("bannoweb-activity-card"));
      bannowebActivityCard.transactionsCollection = module$src$js$api$api.store.transactions;
      bannowebActivityCard.accountsCollection = module$src$js$api$api.store.accounts;
      bannowebActivityCard.transactionsController = module$src$js$api$api.transactionsController;
      bannowebActivityCard.transfersController = module$src$js$api$api.transfersController;
      bannowebActivityCard.transfersCollection = module$src$js$api$api.store.transfers;
    }
    routeEnter(currentNode, nextNodeIfExists, routeId, context, next) {
      super.routeEnter(currentNode, nextNodeIfExists, routeId, context, next);
      module$src$js$util$page.setTitleAndTrack("Dashboard", module$src$js$router$router.getRouteUrlWithoutParams(context));
    }
  };
  customElements.define(window.BannowebDashboardElement.is, window.BannowebDashboardElement);
})();
