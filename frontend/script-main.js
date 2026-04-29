const API_BASE_URL = 'http://localhost:3000/api';
let allProducts = [];
let orderItems = [];
let selectedPaymentMethod = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing POS System...');
    
    // Update user info if logged in
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.textContent = `Logged in as: ${userData.username} (${userData.role})`;
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Fetch products from backend
    fetchProducts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Hide loading indicator
    hideLoadingIndicator();
});

// Hide loading indicator
function hideLoadingIndicator() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Clear all button
    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllItems);
    }

    // Payment method buttons
    const paymentBtns = document.querySelectorAll('.payment-btn');
    paymentBtns.forEach(btn => {
        btn.addEventListener('click', handlePaymentMethod);
    });

    // Make payment button
    const payBtn = document.querySelector('.make-payment-btn');
    if (payBtn) {
        payBtn.addEventListener('click', makePayment);
    }

    // Apply promo code button
    const promoBtn = document.getElementById('applyPromoBtn');
    if (promoBtn) {
        promoBtn.addEventListener('click', applyPromoCode);
    }

    // Scan button
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => alert('Barcode scanner placeholder'));
    }

    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            document.getElementById('productSearch')?.focus();
        }
    });
}

// ==================== PRODUCTS ====================
// Fetch products from backend
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        
        console.log('📊 API Response:', data);
        
        if (data.success && data.products) {
            allProducts = data.products;
            console.log(`✅ Loaded ${allProducts.length} products`);
            if (allProducts.length > 0) {
                displayProducts(allProducts);
            } else {
                console.warn('⚠️ No products returned from API');
            }
        } else {
            console.error('❌ Failed to load products:', data.message);
            showError('Failed to load products from server');
        }
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        showError('Could not connect to backend. Make sure server is running on port 3000.');
    }
}

// Display products
function displayProducts(products) {
    console.log('🎨 displayProducts called with', products ? products.length : 0, 'products');
    
    if (!products || products.length === 0) {
        console.warn('⚠️ No products to display');
        return;
    }

    // Create products grid
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';
    productsGrid.id = 'productsGrid';

    products.slice(0, 20).forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });

    // Find the left panel and insert products after search section
    const leftPanel = document.querySelector('.left-panel');
    console.log('📍 Left panel found:', !!leftPanel);
    
    if (leftPanel) {
        // Remove old grid if it exists
        const oldGrid = document.getElementById('productsGrid');
        if (oldGrid) {
            oldGrid.remove();
            console.log('🔄 Removed old products grid');
        }
        
        const orderHeader = leftPanel.querySelector('.order-header');
        console.log('📍 Order header found:', !!orderHeader);
        
        if (orderHeader) {
            // Insert products grid between search section and order header
            orderHeader.parentNode.insertBefore(productsGrid, orderHeader);
            console.log('✅ Products grid inserted successfully');
        }
    }
    console.log(`✅ Displayed ${products.length} products`);
}

// Create product card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
        <div style="background: #f0f0f0; height: 70px; border-radius: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px;">
            🍔
        </div>
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${product.name}</div>
        <div style="color: #666; font-size: 10px; margin-bottom: 2px;">SKU: ${product.sku}</div>
        <div style="color: #e74c3c; font-weight: bold; font-size: 12px; margin-bottom: 6px;">₹${product.price.toFixed(2)}</div>
        <div style="color: ${product.stock > 0 ? '#27ae60' : '#e74c3c'}; font-size: 10px; margin-bottom: 6px;">Stock: ${product.stock}</div>
        <button style="width: 100%; padding: 6px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: all 0.2s ease;" class="add-to-cart-btn">Add</button>
    `;

    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-3px)';
        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    const addBtn = card.querySelector('.add-to-cart-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addItemToOrder(product);
        });
    }

    return card;
}

// ==================== SEARCH & FILTER ====================
function handleSearch() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    
    // Remove old grid
    const oldGrid = document.getElementById('productsGrid');
    if (oldGrid) {
        oldGrid.remove();
    }

    if (!searchTerm) {
        displayProducts(allProducts);
        return;
    }

    const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm)) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
    );

    displayProducts(filtered);
}

// ==================== ORDER MANAGEMENT ====================
// Add item to order
function addItemToOrder(product) {
    if (!product.stock || product.stock <= 0) {
        showError('Product is out of stock');
        return;
    }

    // Check if product already in cart
    const existingItem = orderItems.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        orderItems.push({
            ...product,
            quantity: 1,
            originalPrice: product.price
        });
    }

    updateOrderDisplay();
    console.log(`✅ Added: ${product.name}`);
}

// Update order display
function updateOrderDisplay() {
    const container = document.getElementById('orderItemsContainer');
    const itemCount = document.getElementById('itemCount');
    
    if (orderItems.length === 0) {
        container.innerHTML = '<div class="empty-order"><div>🛒 No items in order yet. Search and add products above.</div></div>';
        itemCount.textContent = '0';
        updateInvoice();
        return;
    }

    itemCount.textContent = orderItems.length;

    container.innerHTML = orderItems.map((item, index) => `
        <div class="order-item" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #eee;
            background: white;
            margin-bottom: 8px;
            border-radius: 4px;
        ">
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 14px;">${item.name}</div>
                <div style="color: #666; font-size: 12px;">SKU: ${item.sku}</div>
                <div style="color: #e74c3c; font-weight: bold; margin-top: 4px;">₹${item.price.toFixed(2)} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button onclick="decreaseQuantity(${index})" style="padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">−</button>
                <span style="min-width: 30px; text-align: center; font-weight: bold;">${item.quantity}</span>
                <button onclick="increaseQuantity(${index})" style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer;">+</button>
                <button onclick="removeItem(${index})" style="padding: 4px 8px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer; margin-left: 8px;">🗑️</button>
            </div>
        </div>
    `).join('');

    updateInvoice();
}

// Increase quantity
function increaseQuantity(index) {
    if (orderItems[index].quantity < orderItems[index].stock) {
        orderItems[index].quantity += 1;
        updateOrderDisplay();
    }
}

// Decrease quantity
function decreaseQuantity(index) {
    if (orderItems[index].quantity > 1) {
        orderItems[index].quantity -= 1;
    } else {
        removeItem(index);
    }
    updateOrderDisplay();
}

// Remove item
function removeItem(index) {
    orderItems.splice(index, 1);
    updateOrderDisplay();
}

// Clear all items
function clearAllItems() {
    if (orderItems.length === 0) {
        showError('No items to clear');
        return;
    }

    if (confirm('Are you sure you want to clear all items from the order?')) {
        orderItems = [];
        updateOrderDisplay();
        console.log('✅ Order cleared');
    }
}

// ==================== INVOICE CALCULATIONS ====================
function updateInvoice() {
    // Calculate subtotal
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate tax (5%)
    const tax = subtotal * 0.05;
    
    // Get discount (from promo code or manual)
    const discountInput = document.getElementById('discount');
    const discount = parseFloat(discountInput?.textContent?.replace('₹', '') || 0);
    
    // Calculate total
    const total = subtotal + tax - discount;

    // Update display
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;

    // Update invoice number
    const invoiceNum = document.getElementById('invoiceNumber');
    if (invoiceNum) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        invoiceNum.textContent = `INV-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
}

// ==================== PROMO CODE ====================
function applyPromoCode() {
    const promoInput = document.getElementById('promoCode');
    const code = promoInput?.value.toUpperCase().trim();

    if (!code) {
        showError('Please enter a promo code');
        return;
    }

    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Simple promo code logic (customize as needed)
    let discount = 0;
    let message = '';

    if (code === 'SAVE10') {
        discount = subtotal * 0.10;
        message = `✅ 10% discount applied! Saved: ₹${discount.toFixed(2)}`;
    } else if (code === 'SAVE20') {
        discount = subtotal * 0.20;
        message = `✅ 20% discount applied! Saved: ₹${discount.toFixed(2)}`;
    } else if (code === 'FLAT50') {
        discount = 50;
        message = '✅ ₹50 flat discount applied!';
    } else {
        showError('Invalid promo code');
        return;
    }

    const discountEl = document.getElementById('discount');
    if (discountEl) {
        discountEl.textContent = `₹${discount.toFixed(2)}`;
    }

    updateInvoice();
    alert(message);
    promoInput.value = '';
}

// ==================== PAYMENT ====================
function handlePaymentMethod(event) {
    const method = event.target.dataset.method;
    selectedPaymentMethod = method;

    // Update button styles
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.style.background = '#ecf0f1';
        btn.style.color = '#333';
    });

    event.target.style.background = '#3498db';
    event.target.style.color = 'white';

    console.log(`💳 Payment method selected: ${method}`);
}

async function makePayment() {
    if (orderItems.length === 0) {
        showError('No items in order');
        return;
    }

    if (!selectedPaymentMethod) {
        showError('Please select a payment method');
        return;
    }

    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const discountEl = document.getElementById('discount');
    const discount = parseFloat(discountEl?.textContent?.replace('₹', '') || 0);
    const total = subtotal + tax - discount;

    const order = {
        customerName: 'Operator',
        items: orderItems.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
        })),
        subtotal: subtotal,
        tax: tax,
        deliveryFee: 0,
        grandTotal: total,
        orderType: 'dine-in',
        paymentMethod: selectedPaymentMethod.toLowerCase(),
        notes: `Discount: ₹${discount.toFixed(2)}`
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(order)
        });

        const data = await response.json();

        if (data.success) {
            const orderNum = data.order?.id || document.getElementById('invoiceNumber')?.textContent;
            alert(`✅ Payment successful!\n\nOrder ID: ${orderNum}\nTotal: ₹${total.toFixed(2)}\nPayment: ${selectedPaymentMethod}`);
            
            // Reset order
            orderItems = [];
            selectedPaymentMethod = null;
            document.getElementById('promoCode').value = '';
            document.getElementById('discount').textContent = '₹0.00';
            document.querySelectorAll('.payment-btn').forEach(btn => {
                btn.style.background = '#ecf0f1';
                btn.style.color = '#333';
            });
            
            updateOrderDisplay();
            console.log('✅ Order saved:', data.order);
        } else {
            showError(data.message || 'Failed to process payment');
        }
    } catch (error) {
        console.error('❌ Payment error:', error);
        showError('Payment processing failed');
    }
}

// ==================== UTILITIES ====================
function showError(message) {
    alert(`❌ ${message}`);
}

function openReports() {
    window.location.href = 'report.html';
}

function openSettings() {
    alert('⚙️ Settings page coming soon...');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
    }
}

console.log('✅ POS System script loaded successfully');
