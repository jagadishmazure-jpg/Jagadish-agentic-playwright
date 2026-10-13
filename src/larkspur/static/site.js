// Shared header and a tiny localStorage cart. No framework on purpose: the tests target the DOM a user sees.
(function () {
  const h = document.createElement('header');
  h.innerHTML = '<a class="brand" href="/">Larkspur Outfitters</a>' +
    '<nav aria-label="Main"><a href="/catalog">Catalog</a> · <a href="/cart">Cart (<span data-testid="cart-count">0</span>)</a> · ' +
    '<a href="/returns">Returns</a> · <a href="/orders">Orders</a> · <a href="/assistant">Assistant</a> · <a href="/login" id="nav-login">Sign in</a></nav>';
  document.body.prepend(h);
  window.cart = {
    get() { try { return JSON.parse(localStorage.getItem('lk_cart') || '[]'); } catch { return []; } },
    set(items) { localStorage.setItem('lk_cart', JSON.stringify(items)); window.cart.render(); },
    add(sku) { const c = window.cart.get(); c.push(sku); window.cart.set(c); },
    render() { const el = document.querySelector('[data-testid=cart-count]'); if (el) el.textContent = String(window.cart.get().length); },
  };
  window.cart.render();
  fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => {
    if (me) { const a = document.getElementById('nav-login'); a.textContent = 'Account (' + me.display + ')'; a.href = '/account'; }
  });
  window.esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
})();
