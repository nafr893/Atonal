import { Component } from '@theme/component';
import { VariantSelectedEvent, VariantUpdateEvent } from '@theme/events';
import { morph } from '@theme/morph';

export default class VariantPicker extends Component {
  #pendingRequestUrl;
  #abortController;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('change', this.variantChanged.bind(this));
  }

  variantChanged(event) {
    if (!(event.target instanceof HTMLElement)) return;

    this.updateSelectedOption(event.target);
    this.dispatchEvent(new VariantSelectedEvent({ id: event.target.dataset.optionValueId ?? '' }));

    const isOnProductPage =
      Theme.template.name === 'product' &&
      !event.target.closest('product-card') &&
      !event.target.closest('quick-add-dialog');

    const currentUrl = this.dataset.productUrl?.split('?')[0];
    const newUrl = event.target.dataset.connectedProductUrl;
    const loadsNewProduct = isOnProductPage && !!newUrl && newUrl !== currentUrl;

    this.fetchUpdatedSection(this.buildRequestUrl(event.target), loadsNewProduct);

    const url = new URL(window.location.href);

    let variantId;
    if (event.target instanceof HTMLInputElement && event.target.type === 'radio') {
      variantId = event.target.dataset.variantId || null;
    } else if (event.target instanceof HTMLSelectElement) {
      const selectedOption = event.target.options[event.target.selectedIndex];
      variantId = selectedOption?.dataset.variantId || null;
    }

    if (isOnProductPage) {
      if (variantId) {
        url.searchParams.set('variant', variantId);
      } else {
        url.searchParams.delete('variant');
      }
    }

    if (loadsNewProduct) {
      url.pathname = newUrl;
    }

    if (url.href !== window.location.href) {
      history.replaceState({}, '', url.toString());
    }

    // 🔄 Custom hook to handle metafield media updates after variant change
    const metafieldScript = document.getElementById('VariantMediaMetafields');
    if (metafieldScript) {
      const metafieldMediaMap = JSON.parse(metafieldScript.textContent);
      if (variantId && metafieldMediaMap[variantId]) {
        const gallery = document.querySelector('[data-media-gallery]');
        if (gallery) {
          // Inject logic to update media here
          console.log(`Swap media for variant ${variantId}`);
        }
      }
    }
  }

  updateSelectedOption(target) {
    if (typeof target === 'string') {
      const targetElement = this.querySelector(`[data-option-value-id="${target}"]`);
      if (!targetElement) throw new Error('Target element not found');
      target = targetElement;
    }

    if (target instanceof HTMLInputElement) {
      target.checked = true;
    }

    if (target instanceof HTMLSelectElement) {
      const newValue = target.value;
      const newSelectedOption = Array.from(target.options).find(option => option.value === newValue);
      if (!newSelectedOption) throw new Error('Option not found');
      for (const option of target.options) {
        option.removeAttribute('selected');
      }
      newSelectedOption.setAttribute('selected', 'selected');
    }
  }

  buildRequestUrl(selectedOption, source = null, sourceSelectedOptionsValues = []) {
    let productUrl = selectedOption.dataset.connectedProductUrl || this.#pendingRequestUrl || this.dataset.productUrl;
    this.#pendingRequestUrl = productUrl;
    const params = [];

    if (this.selectedOptionsValues.length && !source) {
      params.push(`option_values=${this.selectedOptionsValues.join(',')}`);
    } else if (source === 'product-card') {
      if (this.selectedOptionsValues.length) {
        params.push(`option_values=${sourceSelectedOptionsValues.join(',')}`);
      } else {
        params.push(`option_values=${selectedOption.dataset.optionValueId}`);
      }
    }

    if (this.closest('quick-add-component') || this.closest('swatches-variant-picker-component')) {
      if (productUrl?.includes('?')) {
        productUrl = productUrl.split('?')[0];
      }
      return `${productUrl}?section_id=section-rendering-product-card&${params.join('&')}`;
    }
    return `${productUrl}?${params.join('&')}`;
  }

  fetchUpdatedSection(requestUrl, shouldMorphMain = false) {
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    fetch(requestUrl, { signal: this.#abortController.signal })
      .then(response => response.text())
      .then(responseText => {
        this.#pendingRequestUrl = undefined;
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        html.querySelector('overflow-list[defer]')?.removeAttribute('defer');

        const textContent = html.querySelector(`variant-picker script[type="application/json"]`)?.textContent;
        if (!textContent) return;

        if (shouldMorphMain) {
          this.updateMain(html);
        } else {
          const newProduct = this.updateVariantPicker(html);
          if (this.selectedOptionId) {
            this.dispatchEvent(new VariantUpdateEvent(JSON.parse(textContent), this.selectedOptionId, {
              html,
              productId: this.dataset.productId ?? '',
              newProduct,
            }));
          }
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error(error);
        }
      });
  }

  updateVariantPicker(newHtml) {
    let newProduct;
    const newVariantPickerSource = newHtml.querySelector(this.tagName.toLowerCase());
    if (!newVariantPickerSource) throw new Error('No new variant picker source found');

    if (newVariantPickerSource instanceof HTMLElement) {
      const newProductId = newVariantPickerSource.dataset.productId;
      const newProductUrl = newVariantPickerSource.dataset.productUrl;
      if (newProductId && newProductUrl && this.dataset.productId !== newProductId) {
        newProduct = { id: newProductId, url: newProductUrl };
      }
      this.dataset.productId = newProductId;
      this.dataset.productUrl = newProductUrl;
    }

    morph(this, newVariantPickerSource);
    return newProduct;
  }

  updateMain(newHtml) {
    const main = document.querySelector('main');
    const newMain = newHtml.querySelector('main');
    if (!main || !newMain) throw new Error('No new main source found');
    morph(main, newMain);
  }

  get selectedOption() {
    const selectedOption = this.querySelector('select option[selected], fieldset input:checked');
    if (!(selectedOption instanceof HTMLInputElement || selectedOption instanceof HTMLOptionElement)) {
      return undefined;
    }
    return selectedOption;
  }

  get selectedOptionId() {
    const { selectedOption } = this;
    if (!selectedOption) return undefined;
    const { optionValueId } = selectedOption.dataset;
    if (!optionValueId) throw new Error('No option value ID found');
    return optionValueId;
  }

  get selectedOptionsValues() {
    const selectedOptions = Array.from(this.querySelectorAll('select option[selected], fieldset input:checked'));
    return selectedOptions.map(option => {
      const { optionValueId } = option.dataset;
      if (!optionValueId) throw new Error('No option value ID found');
      return optionValueId;
    });
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
