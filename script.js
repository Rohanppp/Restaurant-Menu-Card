/* The Hungry Hub - Cart & Order Script */
(function () {
  const CURRENCY = '₹';
  const storageKey = 'hungryhub_cart_v1';
  // Set your restaurant WhatsApp number in international format without '+' (e.g., '919876543210').
  const restaurantWhatsApp = '9901523267';

  const els = {
    cartToggle: document.querySelector('.cart-toggle'),
    cartDrawer: document.querySelector('.cart-drawer'),
    cartClose: null,
    cartItems: null,
    cartEmpty: null,
    totalAmount: null,
    orderForm: null,
    countBadge: null,
    filterBar: document.querySelector('.filter-bar'),
  };

  // Dietary classification & filtering
  const tagRules = [
    { tag: 'veg', match: [/paneer|dal|veg|vegetable|samosa|pakora|kheer|rasgulla|gulab|kulfi/i] },
    { tag: 'non-veg', match: [/chicken|lamb|mutton|fish|rogan josh|tandoori/i] },
    { tag: 'vegan', match: [/dal|veg|vegetable|jal jeera/i], exclude: [/paneer|butter|ghee|milk|kheer|lassi|kulfi/i] },
    { tag: 'gluten-free', match: [/rice|biryani|dal|kheer|lassi|jal jeera/i], exclude: [/bread|naan|roti|samosa|pakora/i] },
    { tag: 'spicy', match: [/tikka|masala|tandoori|rogan|jal jeera|pakora/i] },
  ];

  function classify(name) {
    const tags = new Set();
    for (const rule of tagRules) {
      const hit = rule.match?.some((re) => re.test(name));
      const blocked = rule.exclude?.some((re) => re.test(name));
      if (hit && !blocked) tags.add(rule.tag);
    }
    if (!tags.has('non-veg')) tags.add('veg');
    return Array.from(tags);
  }

  function badge(label, cls) {
    const span = document.createElement('span');
    span.className = `badge ${cls}`;
    span.textContent = label;
    return span;
  }

  function injectBadgesAndTags() {
    // Tables
    document.querySelectorAll('.menu-table tbody tr').forEach((tr) => {
      const nameEl = tr.querySelector('.item-name');
      if (!nameEl) return;
      const tags = classify(nameEl.textContent.trim());
      tr.dataset.tags = tags.join(',');
      if (!nameEl.nextElementSibling || !nameEl.nextElementSibling.classList?.contains('badges')) {
        const b = document.createElement('span');
        b.className = 'badges';
        if (tags.includes('veg')) b.appendChild(badge('Veg', 'veg'));
        if (tags.includes('non-veg')) b.appendChild(badge('Non-Veg', 'non-veg'));
        if (tags.includes('vegan')) b.appendChild(badge('Vegan', 'vegan'));
        if (tags.includes('gluten-free')) b.appendChild(badge('GF', 'gluten-free'));
        if (tags.includes('spicy')) b.appendChild(badge('Spicy', 'spicy'));
        nameEl.after(b);
      }
    });
    // Specials
    document.querySelectorAll('.special-item').forEach((card) => {
      const nameEl = card.querySelector('h3');
      if (!nameEl) return;
      const tags = classify(nameEl.textContent.trim());
      card.dataset.tags = tags.join(',');
      const content = card.querySelector('.special-content');
      if (content && !content.querySelector('.badges')) {
        const b = document.createElement('div');
        b.className = 'badges';
        if (tags.includes('veg')) b.appendChild(badge('Veg', 'veg'));
        if (tags.includes('non-veg')) b.appendChild(badge('Non-Veg', 'non-veg'));
        if (tags.includes('vegan')) b.appendChild(badge('Vegan', 'vegan'));
        if (tags.includes('gluten-free')) b.appendChild(badge('GF', 'gluten-free'));
        if (tags.includes('spicy')) b.appendChild(badge('Spicy', 'spicy'));
        content.appendChild(b);
      }
    });
  }

  function applyFilter(filter) {
    const showAll = filter === 'all';
    document.querySelectorAll('.menu-table tbody tr').forEach((tr) => {
      if (showAll) tr.classList.remove('hidden');
      else {
        const tags = (tr.dataset.tags || '').split(',');
        tags.includes(filter) ? tr.classList.remove('hidden') : tr.classList.add('hidden');
      }
    });
    document.querySelectorAll('.special-item').forEach((card) => {
      if (showAll) card.classList.remove('hidden');
      else {
        const tags = (card.dataset.tags || '').split(',');
        tags.includes(filter) ? card.classList.remove('hidden') : card.classList.add('hidden');
      }
    });
  }

  function rupeesToNumber(text) {
    if (!text) return 0;
    // Remove currency symbol and any non-digit except dot
    const n = String(text).replace(/[^0-9.]/g, '');
    return parseFloat(n || '0');
  }

  function formatRupees(num) {
    // Add currency symbol and Indian grouping
    try {
      return CURRENCY + new Intl.NumberFormat('en-IN').format(num);
    } catch (e) {
      return CURRENCY + num.toFixed(2);
    }
  }

  const cart = {
    items: [],
    load() {
      try {
        const raw = localStorage.getItem(storageKey);
        this.items = raw ? JSON.parse(raw) : [];
      } catch (e) {
        this.items = [];
      }
    },
    save() {
      localStorage.setItem(storageKey, JSON.stringify(this.items));
    },
    add(item) {
      const key = item.id;
      const found = this.items.find((i) => i.id === key);
      if (found) {
        found.qty += item.qty || 1;
      } else {
        this.items.push({ id: key, name: item.name, price: item.price, qty: item.qty || 1 });
      }
      this.save();
      render();
    },
    updateQty(id, qty) {
      const it = this.items.find((i) => i.id === id);
      if (!it) return;
      it.qty = Math.max(1, qty);
      this.save();
      render();
    },
    remove(id) {
      this.items = this.items.filter((i) => i.id !== id);
      this.save();
      render();
    },
    clear() {
      this.items = [];
      this.save();
      render();
    },
    total() {
      return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    },
    count() {
      return this.items.reduce((n, i) => n + i.qty, 0);
    },
  };

  function ensureCartDomRefs() {
    els.cartClose = els.cartDrawer.querySelector('.cart-close');
    els.cartItems = els.cartDrawer.querySelector('.cart-items');
    els.cartEmpty = els.cartDrawer.querySelector('.cart-empty');
    els.totalAmount = els.cartDrawer.querySelector('.total-amount');
    els.orderForm = els.cartDrawer.querySelector('.order-form');
    els.countBadge = els.cartToggle?.querySelector('.count');
  }

  function openCart() {
    els.cartDrawer.classList.add('open');
    els.cartDrawer.setAttribute('aria-hidden', 'false');
  }
  function closeCart() {
    els.cartDrawer.classList.remove('open');
    els.cartDrawer.setAttribute('aria-hidden', 'true');
  }

  function createCartItemRow(item) {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = item.name;

    const subtotal = document.createElement('div');
    subtotal.className = 'subtotal';
    subtotal.textContent = formatRupees(item.price * item.qty);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const qty = document.createElement('div');
    qty.className = 'qty-controls';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.textContent = '−';
    btnMinus.addEventListener('click', () => cart.updateQty(item.id, item.qty - 1));

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.value = String(item.qty);
    input.addEventListener('change', () => {
      const v = parseInt(input.value, 10) || 1;
      cart.updateQty(item.id, v);
    });

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => cart.updateQty(item.id, item.qty + 1));

    qty.append(btnMinus, input, btnPlus);

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'remove-item';
    btnRemove.textContent = 'Remove';
    btnRemove.addEventListener('click', () => cart.remove(item.id));

    controls.append(qty, btnRemove);

    row.append(title, controls, subtotal);
    return row;
  }

  function render() {
    // Render items
    els.cartItems.innerHTML = '';
    if (cart.items.length === 0) {
      els.cartEmpty.style.display = 'block';
    } else {
      els.cartEmpty.style.display = 'none';
      cart.items.forEach((it) => {
        els.cartItems.appendChild(createCartItemRow(it));
      });
    }

    // totals and count
    const total = cart.total();
    els.totalAmount.textContent = formatRupees(total);
    if (els.countBadge) els.countBadge.textContent = String(cart.count());
  }

  function makeId(name, price) {
    return name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + price;
  }

  function injectButtons() {
    // Table rows
    document.querySelectorAll('.menu-table tbody tr').forEach((tr) => {
      const nameEl = tr.querySelector('.item-name');
      const priceEl = tr.querySelector('.price');
      if (!nameEl || !priceEl) return;
      const price = rupeesToNumber(priceEl.textContent);
      const name = nameEl.textContent.trim();
      const id = makeId(name, price);

      // Prevent duplicate injection
      if (tr.querySelector('.add-to-cart')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'add-to-cart';
      btn.textContent = 'Add to Cart';
      btn.addEventListener('click', () => cart.add({ id, name, price, qty: 1 }));

      const priceCell = tr.querySelector('td:last-child');
      priceCell?.appendChild(btn);
    });

    // Specials cards
    document.querySelectorAll('.special-item').forEach((card) => {
      const nameEl = card.querySelector('h3');
      const priceEl = card.querySelector('.special-price');
      if (!nameEl || !priceEl) return;
      const price = rupeesToNumber(priceEl.textContent);
      const name = nameEl.textContent.trim();
      const id = makeId(name, price);

      if (card.querySelector('.add-to-cart')) return;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'add-to-cart';
      btn.textContent = 'Add to Cart';
      btn.addEventListener('click', () => cart.add({ id, name, price, qty: 1 }));

      actions.appendChild(btn);
      const content = card.querySelector('.special-content');
      content?.appendChild(actions);
    });
  }

  function bindUi() {
    els.cartToggle?.addEventListener('click', () => {
      if (els.cartDrawer.classList.contains('open')) {
        closeCart();
      } else {
        openCart();
      }
    });
    els.cartClose?.addEventListener('click', closeCart);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCart();
    });

    // Order form
    els.orderForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (cart.items.length === 0) {
        alert('Your cart is empty.');
        return;
      }
      const data = Object.fromEntries(new FormData(els.orderForm).entries());
      const orderSummary = cart.items
        .map((i) => `${i.name} x${i.qty} = ${formatRupees(i.price * i.qty)}`)
        .join('\n');
      const total = formatRupees(cart.total());

      // For now, show a confirmation and clear the cart. Replace this with API/WhatsApp integration if desired.
      alert(
        `Thank you, ${data.name}!\n\nOrder Details:\n${orderSummary}\n\nDelivery to: ${data.address}\nPhone: ${data.phone}\n\nTotal: ${total}`
      );
      cart.clear();
      els.orderForm.reset();
      closeCart();
    });

    // WhatsApp order
    const waBtn = els.cartDrawer.querySelector('.whatsapp-order');
    waBtn?.addEventListener('click', () => {
      if (cart.items.length === 0) {
        alert('Your cart is empty.');
        return;
      }
      const data = Object.fromEntries(new FormData(els.orderForm).entries());
      const lines = [
        `New order from ${data.name || 'Customer'}`,
        `Phone: ${data.phone || '-'}`,
        `Address: ${data.address || '-'}`,
        '',
        'Items:',
        ...cart.items.map((i) => `• ${i.name} x${i.qty} = ${formatRupees(i.price * i.qty)}`),
        '',
        `Total: ${formatRupees(cart.total())}`,
      ];
      const msg = encodeURIComponent(lines.join('\n'));
      const raw = (restaurantWhatsApp || '').replace(/\D/g, '');
      const phone = raw.length === 10 ? `91${raw}` : raw; // auto-prepend India code for 10-digit numbers
      let url = '';
      if (phone && phone.length >= 8 && phone.length <= 15) {
        // Direct chat to specific number
        url = `https://wa.me/${phone}?text=${msg}`;
      } else {
        // Fallback: user picks contact
        url = `https://wa.me/?text=${msg}`;
      }
      window.open(url, '_blank');
    });

    // Filter chips
    els.filterBar?.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      els.filterBar.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter || 'all');
    });
  }

  function init() {
    ensureCartDomRefs();
    cart.load();
    injectBadgesAndTags();
    injectButtons();
    bindUi();
    render();
    // default filter
    applyFilter('all');
  }

  // Delay init until DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
