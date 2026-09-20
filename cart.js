const CART_KEY = 'kinetiq_cart';
const BUY_NOW_KEY = 'kinetiq_buynow';

const ADD_BUTTONS = 'button[aria-label="Add to cart"], .btn-add-cart, #claimDealBtn';
const BUY_BUTTONS = '.btn-buy-now, .btn-market-buy, .cat-showcase-card .btn-petrol';

// All the product cards in the website
const PRODUCT_CARDS = '.showcase-card, .mini-deal-card, .market-card, .cat-showcase-card, .spotlight-card, .product-card-item';
// The cart logo and the red number in the navbar
const cartButton = document.querySelector('.icon-btn');
const cartBadge = document.querySelector('.cart-count');


// ---------- Helper functions (checkout.html uses) ----------

function byId(id) {
    return document.getElementById(id);
}

// 1890 -> ₱1,890.00
function formatPeso(amount) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function loadItems(storage, key) {
    try {
        return JSON.parse(storage.getItem(key)) || [];
    } catch (error) {
        return [];
    }
}

function saveItems(storage, key, items) {
    storage.setItem(key, JSON.stringify(items));
}

function getTotal(items) {
    let total = 0;
    items.forEach(function (item) {
        total = total + item.price * item.qty;
    });
    return total;
}

function getCount(items) {
    let count = 0;
    items.forEach(function (item) {
        count = count + item.qty;
    });
    return count;
}

// One product row (same design in the cart menu and in checkout)
function makeItemRow(item) {
    return `
        <li class="list-group-item px-0" data-id="${item.id}">
            <div class="d-flex gap-3">
                <img src="${item.img}" alt="" width="64" height="64"
                    class="rounded border flex-shrink-0" style="object-fit: contain;">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between gap-2">
                        <h6 class="small fw-bold mb-1">${item.title}</h6>
                        <button class="btn btn-sm text-danger p-0" data-action="remove" aria-label="Remove">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="input-group input-group-sm w-auto">
                            <button class="btn btn-outline-secondary" data-action="minus" aria-label="Decrease">&minus;</button>
                            <span class="input-group-text bg-white px-3">${item.qty}</span>
                            <button class="btn btn-outline-secondary" data-action="plus" aria-label="Increase">+</button>
                        </div>
                        <span class="fw-bold small">${formatPeso(item.price * item.qty)}</span>
                    </div>
                </div>
            </div>
        </li>`;
}

// Handles the  -  +  and trash buttons. Returns true if something changed.
function updateItemFromButton(event, items) {
    const button = event.target.closest('[data-action]');
    if (!button) return false;

    const id = button.closest('li').dataset.id;
    const item = items.find(function (i) {
        return i.id === id;
    });
    if (!item) return false;

    if (button.dataset.action === 'plus') {
        item.qty = item.qty + 1;
    }
    if (button.dataset.action === 'minus' && item.qty > 1) {
        item.qty = item.qty - 1;
    }
    if (button.dataset.action === 'remove') {
        items.splice(items.indexOf(item), 1);
    }
    return true;
}

// Read the product info (name, price, image) from the card that was clicked
function getProduct(button) {
    const card = button.closest(PRODUCT_CARDS);
    if (!card) return null;

    const title = card.querySelector('.showcase-title, .mini-deal-title, .market-product-title, h6, h4.fw-bold').textContent.trim();
    const priceText = card.querySelector('.showcase-price, .mini-deal-price, .market-current-price, #spotlightPrice, .text-danger').textContent;
    const imageElement = card.querySelector('img');

    return {
        imageElement: imageElement,
        item: {
            id: title.toLowerCase().replace(/\W+/g, '-'),
            title: title,
            price: parseFloat(priceText.replace(/[^\d.]/g, '')),
            img: imageElement.src,
            qty: 1
        }
    };
}


// ---------- Cart menu (only runs on pages with the cart logo) ----------

function setupCartMenu() {
    // 1. Add the cart menu (Bootstrap offcanvas) and the toast area to the page
    document.body.insertAdjacentHTML('beforeend', `
        <div class="offcanvas offcanvas-end" tabindex="-1" id="cartMenu" aria-label="My Cart">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title fw-bold">My Cart</h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <p class="text-center text-muted mt-5" id="cartEmpty">Your cart is empty.</p>
                <ul class="list-group list-group-flush" id="cartList"></ul>
            </div>
            <div class="border-top p-3" id="cartFooter">
                <div class="d-flex justify-content-between fw-bold mb-3">
                    <span>Subtotal</span>
                    <span id="cartTotal"></span>
                </div>
                <a href="Checkout.html" class="btn btn-petrol w-100">Checkout</a>
            </div>
        </div>
        <div class="toast-container position-fixed bottom-0 end-0 p-3" id="toastArea"></div>`);

    const cartMenu = new bootstrap.Offcanvas(byId('cartMenu'));
    const cart = loadItems(localStorage, CART_KEY);

    // 2. Update everything that shows the cart (number, list, total)
    function refreshCart() {
        const count = getCount(cart);

        cartBadge.textContent = count;
        cartBadge.classList.toggle('d-none', count === 0);

        byId('cartEmpty').classList.toggle('d-none', count > 0);
        byId('cartFooter').classList.toggle('d-none', count === 0);
        byId('cartList').innerHTML = cart.map(makeItemRow).join('');
        byId('cartTotal').textContent = formatPeso(getTotal(cart));

        saveItems(localStorage, CART_KEY, cart);
    }

    // 3. The product image flies to the cart logo
    function flyToCart(imageElement, whenDone) {
        const from = imageElement.getBoundingClientRect();
        const to = cartButton.getBoundingClientRect();

        // how far the image must move (center to center)
        const moveX = (to.left + to.width / 2) - (from.left + from.width / 2);
        const moveY = (to.top + to.height / 2) - (from.top + from.height / 2);

        // make a copy of the image on top of the page
        const flyingImage = imageElement.cloneNode();
        flyingImage.className = 'position-fixed rounded-circle border bg-white shadow';
        flyingImage.style.cssText = `left: ${from.left}px; top: ${from.top}px; width: ${from.width}px; height: ${from.height}px; object-fit: contain; z-index: 2000; pointer-events: none;`;
        document.body.appendChild(flyingImage);

        // move it, then remove it
        const animation = flyingImage.animate([
            { transform: 'none', opacity: 1 },
            { transform: `translate(${moveX}px, ${moveY}px) scale(0.1)`, opacity: 0.5 }
        ], { duration: 700, easing: 'ease-in' });

        animation.onfinish = function () {
            flyingImage.remove();
            whenDone();
        };
    }

    // 4. Bootstrap toast: "Added to cart"
    function showToast(item) {
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-bg-success border-0';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center gap-2">
                    <img src="${item.img}" alt="" width="44" height="44"
                        class="rounded bg-white flex-shrink-0" style="object-fit: contain;">
                    <div>
                        <strong class="d-block">Added to cart</strong>
                        <span class="small">${item.title}</span>
                        <a href="#" class="text-white fw-bold small ms-1"
                            data-bs-toggle="offcanvas" data-bs-target="#cartMenu">View</a>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white m-auto me-2"
                    data-bs-dismiss="toast" aria-label="Close"></button>
            </div>`;

        byId('toastArea').appendChild(toast);
        toast.addEventListener('hidden.bs.toast', function () {
            toast.remove();
        });
        new bootstrap.Toast(toast, { delay: 2500 }).show();
    }

    // 5. Put a product in the cart
    function addToCart(newItem) {
        const existing = cart.find(function (i) {
            return i.id === newItem.id;
        });

        if (existing) {
            existing.qty = existing.qty + 1;
        } else {
            cart.push(newItem);
        }

        refreshCart();
        showToast(newItem);
    }

    // 6. Listen to the buttons
    document.addEventListener('click', function (event) {
        const buyButton = event.target.closest(BUY_BUTTONS);
        const addButton = event.target.closest(ADD_BUTTONS);
        const clickedButton = buyButton || addButton;
        if (!clickedButton) return;

        const product = getProduct(clickedButton);
        if (!product) return;
        event.preventDefault();

        if (buyButton) {
            // Buy Now: checkout with only this product
            saveItems(sessionStorage, BUY_NOW_KEY, [product.item]);
            location.href = './Checkout.html?mode=buynow';
        } else {
            flyToCart(product.imageElement, function () {
                addToCart(product.item);
            });
        }
    });

    cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        cartMenu.show();
    });

    // Click  -  +  trash  inside the cart menu
    byId('cartList').addEventListener('click', function (event) {
        if (updateItemFromButton(event, cart)) {
            refreshCart();
        }
    });

    refreshCart();
}

if (cartButton) {
    setupCartMenu();
}

// Search Filtering All Products
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector('input[aria-label="Search"]');
    const cards = document.querySelectorAll(PRODUCT_CARDS);

    if (!searchInput || cards.length === 0) return;

    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();

        if (query.length === 0) {
            // Show all cards when search is empty
            cards.forEach(card => card.style.display = 'block');
            return;
        }

        // Hide cards that don't match the search query
        cards.forEach(card => {
            // Get text content from card, convert to lowercase
            const cardText = card.textContent.toLowerCase();

            // Check if card text includes the search query
            if (cardText.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});
const grid = document.getElementById('productGrid') || document.getElementById('catalogProductGrid');
const products = [...grid.children];
const sortBtn = document.getElementById('sortBtn');

const getPrice = p =>
    Number(p.querySelector('.market-current-price, .text-danger.fs-5').textContent.replace(/[^\d.]/g, ''));

function sortProducts(type) {
    const list = [...products];
    if (type === 'latest') list.reverse();
    if (type === 'low') list.sort((a, b) => getPrice(a) - getPrice(b));
    if (type === 'high') list.sort((a, b) => getPrice(b) - getPrice(a));
    list.forEach(p => grid.appendChild(p));
}

document.querySelectorAll('[data-sort]').forEach(item => {
    item.onclick = e => {
        e.preventDefault();
        sortProducts(item.dataset.sort);
        document.querySelectorAll('[data-sort]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        sortBtn.textContent = 'Sort by: ' + item.textContent;
    };
});



