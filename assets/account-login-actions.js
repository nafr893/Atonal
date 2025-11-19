// Disabled completely for legacy customer accounts.
// We define the element so the theme doesn't error,
// but no login behavior is initialized.

class AccountLoginActions extends HTMLElement {
  connectedCallback() {
    // No-op — intentionally empty.
    // Legacy accounts use password login only.
  }
}

if (!customElements.get('account-login-actions')) {
  customElements.define('account-login-actions', AccountLoginActions);
}
