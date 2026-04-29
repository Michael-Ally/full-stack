// ==================== CUSTOMER ORDER PAGE ====================

const API_URL = 'http://localhost:3000/api';
let cart = [];
let products = [];
let currentCategory = 'all';
let trackingInterval = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAccess()) return;
    loadUserInfo();
    loadProducts();
    setupEventListeners();
    updateCartDisplay();
    // Auto-open tracking to show any active orders
    toggleSection('orderTracking');
});

function checkAccess() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'customer') {
        showToast('Access denied. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'main-page.html', 1500);
        return false;
    }
    return true;
}

function loadUserInfo() {
    const user = localStorage.getItem('user');
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');

    if (user) {
        try {
            const userData = JSON.parse(user);
            if (userNameEl) userNameEl.textContent = userData.username || 'Customer';
            if (userRoleEl) userRoleEl.textContent = (userData.role || 'customer').toUpperCase();
        } catch (e) {
            if (userNameEl) userNameEl.textContent = 'Customer';
        }
    }
}

// ==================== PRODUCTS ====================
async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading delicious items...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();

        if (data.success) {
            products = data.products;
            displayProducts(products);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = '<div class="no-products">Unable to load menu. Please refresh.</div>';
        showToast('Failed to load products', 'error');
    }
}

function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    const countEl = document.getElementById('productCount');

    if (items.length === 0) {
        grid.innerHTML = '<div class="no-products">No items found matching your search.</div>';
        if (countEl) countEl.textContent = '0 items';
        return;
    }

    if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

    grid.innerHTML = items.map(product => {
        const isOutOfStock = product.stock === 0;
        const isLowStock = product.stock > 0 && product.stock < 7;

        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
                <div class="product-image">
                    <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${escapeHtml(product.name)}" />
                    ${isOutOfStock ? '<div class="out-of-stock-badge">Out of Stock</div>' : ''}
                    ${isLowStock ? `<div class="low-stock-badge">Only ${product.stock} left</div>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(product.description || '')}</p>
                    <div class="product-meta">
                        <span class="product-price">₹${product.price.toFixed(2)}</span>
                        <span class="product-stock">${product.stock} in stock</span>
                    </div>
                </div>
                ${isOutOfStock
                    ? '<button class="out-of-stock-btn" disabled>Out of Stock</button>'
                    : `<button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${escapeJs(product.name)}', ${product.price})">Add to Cart</button>`
                }
            </div>
        `;
    }).join('');
}

function filterProducts() {
    const query = document.getElementById('productSearch').value.toLowerCase().trim();

    let filtered = products;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (query) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }

    displayProducts(filtered);
}

function setupEventListeners() {
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            filterProducts();
        });
    });

    // Search input - real-time
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterProducts, 300));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') filterProducts();
        });
    }
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

// ==================== CART ====================
function addToCart(productId, productName, price) {
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: productId, name: productName, price, quantity: 1 });
    }

    updateCartDisplay();
    showToast(`${productName} added to cart`, 'success');
}

function updateQuantity(productId, newQty) {
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity = newQty;
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    const item = cart.find(i => i.id === productId);
    cart = cart.filter(i => i.id !== productId);
    updateCartDisplay();
    if (item) showToast(`${item.name} removed`, 'warning');
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const deliveryFeeEl = document.getElementById('cartDeliveryFee');
    const totalEl = document.getElementById('cartTotal');
    const badge = document.getElementById('cartBadge');
    const btn = document.getElementById('placeOrderBtn');

    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    if (badge) badge.textContent = itemCount;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <span class="empty-icon">🛒</span>
                <p>Your cart is empty</p>
                <small>Add items from the menu</small>
            </div>
        `;
        subtotalEl.textContent = '₹0.00';
        taxEl.textContent = '₹0.00';
        deliveryFeeEl.textContent = '₹0.00';
        totalEl.textContent = '₹0.00';
        if (btn) btn.disabled = true;
        return;
    }

    let subtotal = 0;
    cartItems.innerHTML = cart.map(item => {
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <p>₹${item.price.toFixed(2)} each</p>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
                    <span class="quantity">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    <button class="remove-btn" onclick="removeFromCart('${item.id}')">×</button>
                </div>
                <div class="item-total">₹${lineTotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    const tax = subtotal * 0.08;
    const isDelivery = document.querySelector('input[name="orderType"]:checked')?.value === 'delivery';
    const deliveryFee = isDelivery ? 40 : 0;
    const total = subtotal + tax + deliveryFee;

    subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    taxEl.textContent = `₹${tax.toFixed(2)}`;
    deliveryFeeEl.textContent = `₹${deliveryFee.toFixed(2)}`;
    totalEl.textContent = `₹${total.toFixed(2)}`;
    if (btn) btn.disabled = false;
}

function onOrderTypeChange() {
    const isDelivery = document.querySelector('input[name="orderType"]:checked').value === 'delivery';
    document.getElementById('pickupFields').style.display = isDelivery ? 'none' : 'block';
    document.getElementById('deliveryFields').style.display = isDelivery ? 'block' : 'none';
    document.getElementById('deliveryFeeRow').style.display = isDelivery ? 'flex' : 'none';
    updateCartDisplay();
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    sidebar.classList.toggle('open');
}

// ==================== CHECKOUT ====================
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const orderType = document.querySelector('input[name="orderType"]:checked').value;

    if (orderType === 'pickup') {
        const tableNum = document.getElementById('tableNumber').value;
        if (!tableNum || tableNum < 1) {
            showToast('Please enter your table number', 'error');
            return;
        }
    } else {
        const addr = document.getElementById('streetAddress').value;
        const zip = document.getElementById('zipCode').value;
        const phone = document.getElementById('deliveryPhone').value;
        if (!addr || !zip || !phone) {
            showToast('Please fill all delivery details', 'error');
            return;
        }
    }

    // Build order
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = subtotal * 0.08;
    const deliveryFee = orderType === 'delivery' ? 40 : 0;
    const grandTotal = subtotal + tax + deliveryFee;

    const user = localStorage.getItem('user');
    let customerName = 'Customer';
    let phone = '';
    try {
        const u = JSON.parse(user);
        customerName = u.username || 'Customer';
        phone = u.phone || '';
    } catch (e) {}

    const order = {
        customerName,
        phone,
        items: cart.map(i => ({
            productId: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            total: i.price * i.quantity
        })),
        subtotal,
        tax,
        deliveryFee,
        grandTotal,
        orderType,
        tableNumber: orderType === 'pickup' ? parseInt(document.getElementById('tableNumber').value) : null,
        deliveryAddress: orderType === 'delivery' ? {
            street: document.getElementById('streetAddress').value,
            city: document.getElementById('city').value || 'Your City',
            zip: document.getElementById('zipCode').value,
            phone: document.getElementById('deliveryPhone').value
        } : null,
        notes: document.getElementById('orderNotes').value,
        paymentMethod: 'cash'
    };

    // Save to backend
    fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showOrderConfirmation(data.order || order);
            cart = [];
            updateCartDisplay();
            document.getElementById('tableNumber').value = '';
            document.getElementById('orderNotes').value = '';
            // Refresh tracking
            loadActiveOrders();
            toggleSection('orderTracking');
        } else {
            showToast(data.message || 'Order failed', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Network error. Please try again.', 'error');
    });
}

function showOrderConfirmation(order) {
    const modal = document.getElementById('orderModal');
    const summary = document.getElementById('orderSummary');

    const total = order.grandTotal || order.total || 0;
    const items = order.items || [];

    summary.innerHTML = `
        <div class="order-details-box">
            <p><strong>Order ID:</strong> ${order.id || 'ORD-' + Date.now()}</p>
            ${order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
            <p><strong>Items:</strong></p>
            <ul>
                ${items.map(i => `<li>${i.quantity}× ${escapeHtml(i.name)} — ₹${(i.price * i.quantity).toFixed(2)}</li>`).join('')}
            </ul>
            <p class="total-line"><strong>Total: ₹${total.toFixed(2)}</strong></p>
            ${order.notes ? `<p><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ''}
        </div>
    `;

    modal.style.display = 'block';
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// ==================== SECTION TOGGLE ====================
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + 'Content');
    const icon = document.getElementById(sectionId + 'Icon');
    const isOpen = content.classList.contains('open');

    if (isOpen) {
        content.classList.remove('open');
        if (icon) icon.classList.remove('open');
    } else {
        content.classList.add('open');
        if (icon) icon.classList.add('open');
        // Load data when opening
        if (sectionId === 'orderHistory') loadOrderHistory();
        if (sectionId === 'orderTracking') loadActiveOrders();
    }
}

// ==================== ORDER HISTORY ====================
async function loadOrderHistory() {
    const list = document.getElementById('orderHistoryList');
    list.innerHTML = '<p class="loading-text">Loading your orders...</p>';

    try {
        const res = await fetch(`${API_URL}/orders`);
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        // Filter by current customer name (since backend doesn't filter by customerId)
        const user = localStorage.getItem('user');
        let customerName = '';
        try { customerName = JSON.parse(user).username || ''; } catch (e) {}

        let customerOrders = data.orders;
        if (customerName) {
            customerOrders = customerOrders.filter(o =>
                (o.customerName || '').toLowerCase() === customerName.toLowerCase()
            );
        }

        // If no matching orders, show all (demo mode)
        if (customerOrders.length === 0) {
            customerOrders = data.orders.slice(0, 10);
        }

        displayOrderHistory(customerOrders);
    } catch (error) {
        console.error('Error loading order history:', error);
        // Fallback to localStorage
        const localOrders = JSON.parse(localStorage.getItem('cashierOrders')) || [];
        displayOrderHistory(localOrders.slice(0, 10));
    }
}

function displayOrderHistory(orders) {
    const list = document.getElementById('orderHistoryList');

    if (!orders || orders.length === 0) {
        list.innerHTML = `
            <div class="no-orders">
                <p>No orders found yet.</p>
                <small>Place your first order to see it here!</small>
            </div>
        `;
        return;
    }

    // Sort newest first
    const sorted = [...orders].sort((a, b) =>
        new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
    );

    list.innerHTML = sorted.map(order => {
        const total = order.grandTotal || order.total || 0;
        const date = new Date(order.createdAt || order.timestamp).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const items = order.items || [];

        return `
            <div class="history-item">
                <div class="order-info-main">
                    <div class="order-id">${order.id || 'Order'}</div>
                    <div class="order-meta">
                        ${items.length} items • ₹${total.toFixed(2)} • ${date}
                    </div>
                </div>
                <span class="order-status-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span>
                <div class="order-actions">
                    <button class="view-details-btn" onclick='viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})'>Details</button>
                </div>
            </div>
        `;
    }).join('');
}

function viewOrderDetails(order) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    const items = order.items || [];
    const total = order.grandTotal || order.total || 0;

    content.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Order ID</span>
            <span class="detail-value">${order.id || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value" style="text-transform:capitalize;">${order.status || 'pending'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${new Date(order.createdAt || order.timestamp).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value" style="text-transform:capitalize;">${order.orderType || 'pickup'}</span>
        </div>
        ${order.tableNumber ? `
        <div class="detail-row">
            <span class="detail-label">Table</span>
            <span class="detail-value">${order.tableNumber}</span>
        </div>` : ''}
        <div class="detail-items">
            <strong>Items:</strong>
            ${items.map(i => `
                <div class="detail-item-row">
                    <span>${i.quantity}× ${escapeHtml(i.name)}</span>
                    <span>₹${(i.price * i.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="detail-row" style="border-top:2px solid #e2e8f0; margin-top:12px; padding-top:12px;">
            <span class="detail-label">Total</span>
            <span class="detail-value" style="color:#667eea; font-size:1.1rem;">₹${total.toFixed(2)}</span>
        </div>
        ${order.notes ? `
        <div class="detail-row">
            <span class="detail-label">Notes</span>
            <span class="detail-value">${escapeHtml(order.notes)}</span>
        </div>` : ''}
    `;

    modal.style.display = 'block';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// ==================== LIVE TRACKING ====================
async function loadActiveOrders() {
    const list = document.getElementById('trackingList');
    list.innerHTML = '<p class="loading-text">Loading active orders...</p>';

    try {
        const res = await fetch(`${API_URL}/orders`);
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        // Filter active statuses
        const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
        let activeOrders = data.orders.filter(o => activeStatuses.includes(o.status));

        // Filter by current customer
        const user = localStorage.getItem('user');
        let customerName = '';
        try { customerName = JSON.parse(user).username || ''; } catch (e) {}
        if (customerName) {
            const filtered = activeOrders.filter(o =>
                (o.customerName || '').toLowerCase() === customerName.toLowerCase()
            );
            if (filtered.length > 0) activeOrders = filtered;
        }

        displayActiveOrders(activeOrders);
    } catch (error) {
        console.error('Error loading active orders:', error);
        // Fallback
        const localOrders = JSON.parse(localStorage.getItem('cashierOrders')) || [];
        const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
        const active = localOrders.filter(o => activeStatuses.includes(o.status)).slice(0, 5);
        displayActiveOrders(active);
    }
}

function displayActiveOrders(orders) {
    const list = document.getElementById('trackingList');

    if (!orders || orders.length === 0) {
        list.innerHTML = `
            <div class="no-active-orders">
                <p>No active orders right now.</p>
                <small>Place an order to start tracking!</small>
            </div>
        `;
        return;
    }

    list.innerHTML = orders.map(order => {
        const progress = getStatusProgress(order.status);
        const steps = getStatusSteps(order.status);
        const total = order.grandTotal || order.total || 0;
        const items = order.items || [];
        const time = new Date(order.createdAt || order.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="tracking-item">
                <div class="tracking-order-id">${order.id || 'Order'}</div>
                <div class="tracking-status-bar">
                    <div class="status-track">
                        <div class="status-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="status-label">${formatStatus(order.status)}</span>
                </div>
                <div class="status-steps">
                    <div class="status-step ${steps >= 1 ? 'active' : ''} ${steps > 1 ? 'completed' : ''}">Confirmed</div>
                    <div class="status-step ${steps >= 2 ? 'active' : ''} ${steps > 2 ? 'completed' : ''}">Preparing</div>
                    <div class="status-step ${steps >= 3 ? 'active' : ''} ${steps > 3 ? 'completed' : ''}">Ready</div>
                    <div class="status-step ${steps >= 4 ? 'active' : ''}">Completed</div>
                </div>
                <div class="tracking-details">
                    <span>${items.length} items • ₹${total.toFixed(2)}</span>
                    <span>Ordered at ${time}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString();
}

function getStatusProgress(status) {
    switch (status) {
        case 'pending': return 10;
        case 'confirmed': return 30;
        case 'preparing': return 55;
        case 'ready': return 80;
        case 'out_for_delivery': return 90;
        case 'completed': return 100;
        default: return 5;
    }
}

function getStatusSteps(status) {
    switch (status) {
        case 'pending': return 0;
        case 'confirmed': return 1;
        case 'preparing': return 2;
        case 'ready': return 3;
        case 'out_for_delivery':
        case 'completed': return 4;
        default: return 0;
    }
}

function formatStatus(status) {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function refreshTracking() {
    loadActiveOrders();
    showToast('Tracking refreshed', 'info');
}

// Auto-refresh every 15 seconds when tracking is open
setInterval(() => {
    const trackingContent = document.getElementById('orderTrackingContent');
    if (trackingContent && trackingContent.classList.contains('open')) {
        loadActiveOrders();
    }
}, 15000);

// ==================== UTILITIES ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.textContent = `${icons[type] || 'ℹ'} ${message}`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeJs(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Close modals on outside click
window.onclick = function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
};

