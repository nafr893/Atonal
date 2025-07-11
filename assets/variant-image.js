document.addEventListener('DOMContentLoaded', function() {
  var variantSelectors = document.querySelectorAll('[name="id"]');
  var imageContainer = document.getElementById('custom-variant-image');

  variantSelectors.forEach(function(selector) {
    selector.addEventListener('change', function(e) {
      var variantId = e.target.value;
      fetch(`/products/{{ product.handle }}.js`)
        .then(response => response.json())
        .then(data => {
          var variant = data.variants.find(v => v.id == variantId);
          if (
            variant &&
            variant.metafields &&
            variant.metafields.custom &&
            Array.isArray(variant.metafields.custom.variant_image)
          ) {
            imageContainer.innerHTML = variant.metafields.custom.variant_image
              .map(url => `<img src="${url}" alt="Variant Image" />`)
              .join('');
          }
        });
    });
  });
});