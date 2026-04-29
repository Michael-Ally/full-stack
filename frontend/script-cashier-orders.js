// Cashier Orders Management Script

const API_BASE_URL = 'http://localhost:3000/api';

// Load orders from backend API and merge with localStorage
let orders = [];

// Global variable for current filter
let currentFilter = 'all';

// Initialize the orders page
document.addEventListener('DOMContentLoaded', function() {
    checkStaffAccess();
    loadOrdersFromAPI();
    setupOrderFilters();
});

// Fetch orders from backend API
async function loadOrdersFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        const data = await response.json();

        if (data.success) {
            orders = data.orders || [];
            console.log(`✅ Loaded ${orders.length} orders from backend`);
        } else {
            console.warn('⚠️ Failed to fetch orders from API, falling back to localStorage');
            loadOrdersFromStorage();
        }
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        loadOrdersFromStorage();
    }
    loadOrders();
}

// Fallback: Load orders from localStorage
function loadOrdersFromStorage() {
    const storedOrders = JSON.parse(localStorage.getItem('cashierOrders')) || [];

    // Sample orders for demo (only if no stored orders)
    const sampleOrders = [
        {
            id: "ORD-001",
            customerName: "John Doe",
            tableNumber: "T5",
            items: [
                { name: "Burger", quantity: 2, price: 15.99 },
                { name: "Fries", quantity: 1, price: 5.99 },
                { name: "Coke", quantity: 2, price: 2.99 }
            ],
            total: 43.95,
            status: "pending",
            timestamp: "2024-03-24 14:30:00",
            notes: "Extra cheese on burgers"
        },
        {
            id: "ORD-002",
            customerName: "Jane Smith",
            tableNumber: "T3",
            items: [
                { name: "Pizza Margherita", quantity: 1, price: 18.99 },
                { name: "Salad", quantity: 1, price: 8.99 }
            ],
            total: 27.98,
            status: "preparing",
            timestamp: "2024-03-24 14:25:00",
            notes: ""
        }
    ];

    orders = storedOrders.length > 0 ? storedOrders : sampleOrders;
}

// Check if user has staff access (admin or cashier only)
function checkStaffAccess() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin' && userRole !== 'cashier') {
        alert('Access denied. This page is for staff only.');
        window.location.href = 'login.html';
    }
}

// Load and display orders
function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    ordersList.innerHTML = '';

    const filteredOrders = currentFilter === 'all'
        ? orders
        : orders.filter(order => order.status === currentFilter);

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<div class="no-orders">No orders found for this filter.</div>';
        return;
    }

    filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersList.appendChild(orderCard);
    });
}

// Create order card HTML
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card ${order.status}`;

    // Handle both backend format (grandTotal, createdAt) and local format (total, timestamp)
    const orderTotal = order.grandTotal || order.total || 0;
    const orderTime = order.createdAt || order.timestamp || '';
    const tableNum = order.tableNumber || 'N/A';
    const customer = order.customerName || 'Guest';

    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h3>${order.id}</h3>
                <span class="customer-name">${customer}</span>
                <span class="table-number">Table ${tableNum}</span>
            </div>
            <div class="order-status">
                <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span>
            </div>
        </div>

        <div class="order-details">
            <div class="order-items">
                ${(order.items || []).map(item => `
                    <div class="order-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">x${item.quantity}</span>
                        <span class="item-price">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="order-total">
                <strong>Total: ₹${orderTotal.toFixed(2)}</strong>
            </div>

            ${order.notes ? `<div class="order-notes"><strong>Notes:</strong> ${order.notes}</div>` : ''}

            <div class="order-timestamp">
                ${orderTime}
            </div>
        </div>

        <div class="order-actions">
            ${getOrderActions(order)}
        </div>
    `;

    return card;
}

// Get appropriate actions based on order status
function getOrderActions(order) {
    switch(order.status) {
        case 'pending':
            return `
                <button class="action-btn prepare-btn" onclick="updateOrderStatus('${order.id}', 'preparing')">
                    Start Preparing
                </button>
                <button class="action-btn cancel-btn" onclick="cancelOrder('${order.id}')">
                    Cancel Order
                </button>
            `;
        case 'preparing':
            return `
                <button class="action-btn ready-btn" onclick="updateOrderStatus('${order.id}', 'ready')">
                    Mark as Ready
                </button>
                <button class="action-btn cancel-btn" onclick="cancelOrder('${order.id}')">
                    Cancel Order
                </button>
            `;
        case 'ready':
            return `
                <button class="action-btn complete-btn" onclick="updateOrderStatus('${order.id}', 'completed')">
                    Mark as Completed
                </button>
            `;
        case 'completed':
            return `
                <button class="action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                    View Details
                </button>
            `;
        default:
            return '';
    }
}

// Filter orders by status
function filterOrders(status) {
    currentFilter = status;

    // Update button styles
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(status)) {
            btn.classList.add('active');
        }
    });

    // Reload orders based on filter
    loadOrders();
}

// Sort orders by a given key
function sortOrders(key, ascending = true) {
    orders.sort((a, b) => {
        if (key === 'timestamp') {
            return ascending
                ? new Date(a[key]) - new Date(b[key])
                : new Date(b[key]) - new Date(a[key]);
        }
        if (key === 'total') {
            return ascending ? a[key] - b[key] : b[key] - a[key];
        }
        return 0;
    });

    // Reload orders after sorting
    loadOrders();
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();

        if (data.success) {
            // Update local array
            const order = orders.find(o => o.id === orderId);
            if (order) {
                order.status = newStatus;
                loadOrders();
                showNotification(`Order ${orderId} status updated to ${newStatus}`, 'success');
            }
        } else {
            showNotification(data.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        // Fallback: update locally only
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            loadOrders();
            showNotification(`Order ${orderId} status updated to ${newStatus} (offline)`, 'warning');
        }
    }
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        const data = await response.json();

        if (data.success) {
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                orders.splice(orderIndex, 1);
                loadOrders();
                showNotification(`Order ${orderId} has been cancelled`, 'warning');
            }
        } else {
            showNotification(data.message || 'Failed to cancel order', 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        // Fallback: remove locally only
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            orders.splice(orderIndex, 1);
            loadOrders();
            showNotification(`Order ${orderId} has been cancelled (offline)`, 'warning');
        }
    }
}

// View order details (for completed orders)
function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        alert(`Order Details:\n\nID: ${order.id}\nCustomer: ${order.customerName}\nTable: ${order.tableNumber}\nTotal: ₹${order.total.toFixed(2)}\nStatus: ${order.status}\nTime: ${order.timestamp}`);
    }
}

// Setup filter button event listeners
function setupOrderFilters() {
    // Already handled by onclick attributes in HTML
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
