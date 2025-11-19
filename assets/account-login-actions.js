// Legacy customer accounts enabled:
// Disable Shop login / new customer accounts UI.

class AccountLoginActions extends HTMLElement {
  connectedCallback() {
    // No-op on purpose.
    // We do NOT initialize <shop-login-button> or any new-account flows here.
    // If this element is ever rendered, it just sits there.
  }
}

if (!customElements.get('account-login-actions')) {
  customElements.define('account-login-actions', AccountLoginActions);
}
