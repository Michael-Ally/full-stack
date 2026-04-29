let checkoutData = null;
let selectedPaymentMethod = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAccess()) return;
    showUser();
    loadCheckoutData();
    renderOrder();
    setupPaymentListeners();
});

function checkAccess() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'customer') {
        alert('Access denied. This page is for customers only.');
        window.location.href = 'main-page.html';
        return false;
    }
    return true;
}

    if (!allowedRoles.includes(role)) {
        alert("Access Denied!");
        window.location.href = "login.html";
    }


function showUser() {
    const user = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole');
    const userName = document.getElementById('userName');
    const userRoleDiv = document.getElementById('userRole');
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            userName.textContent = userData.username;
            userRoleDiv.textContent = userRole || 'Customer';
        } catch (e) {
            userName.textContent = 'Customer';
            userRoleDiv.textContent = 'Customer';
        }
    } else {
        userName.textContent = 'Guest';
        userRoleDiv.textContent = 'Guest';
    }
}

function logout() {
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem('cartItems');
    window.location.href = "login.html";
}

function loadCheckoutData() {
    const data = localStorage.getItem('checkoutData');
    if (!data) {
        alert('No checkout data found. Please go back to order page.');
        window.location.href = 'customer-order.html';
        return;
    }

    checkoutData = JSON.parse(data);
    console.log('Loaded checkout data:', checkoutData);
}

function renderOrder() {
    renderCartItems();
    updateBill();
    updateOrderDetails();
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');

    cartItemsContainer.innerHTML = checkoutData.cart.map(item => `
        <div class="cart-item">
            <div class="item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price.toFixed(2)} each × ${item.quantity}</p>
            </div>
            <div class="item-price">
                ₹${(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');
}

function updateBill() {
    const subtotal = checkoutData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const deliveryFee = checkoutData.orderType === 'delivery' ? 2.99 : 0;
    const total = subtotal + tax + deliveryFee;

    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('deliveryFee').textContent = `₹${deliveryFee.toFixed(2)}`;
    document.getElementById('total').textContent = `₹${total.toFixed(2)}`;
}

function updateOrderDetails() {
    // Order type
    document.getElementById('orderTypeDisplay').textContent = checkoutData.orderType === 'delivery' ? 'Delivery' : 'Pickup';

    // Customer info
    document.getElementById('customerDisplay').textContent = localStorage.getItem('username') || 'Customer';

    // Item count
    document.getElementById('itemCountDisplay').textContent = checkoutData.cart.reduce((sum, item) => sum + item.quantity, 0);

    // Table section
    if (checkoutData.orderType === 'pickup') {
        document.getElementById('tableSection').style.display = 'block';
        document.getElementById('tableNumberDisplay').textContent = checkoutData.tableNumber;
    }

    // Delivery section
    if (checkoutData.orderType === 'delivery') {
        document.getElementById('deliverySection').style.display = 'block';
        document.getElementById('streetDisplay').textContent = checkoutData.deliveryAddress.street;
        document.getElementById('cityDisplay').textContent = checkoutData.deliveryAddress.city;
        document.getElementById('zipDisplay').textContent = checkoutData.deliveryAddress.zip;
        document.getElementById('phoneDisplay').textContent = checkoutData.deliveryAddress.phone;
    }

    // Notes section
    if (checkoutData.notes) {
        document.getElementById('notesSection').style.display = 'block';
        document.getElementById('notesDisplay').textContent = checkoutData.notes;
    }
}

function setupPaymentListeners() {
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', () => selectPaymentMethod(option.dataset.method));
    });

    // Pay button
    document.getElementById('payButton').addEventListener('click', processPayment);

    // Success modal close
    document.getElementById('closeSuccessModal').addEventListener('click', closeSuccessModal);
    document.getElementById('successModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('successModal')) {
            closeSuccessModal();
        }
    });
}

function selectPaymentMethod(method) {
    // Remove selected class from all payment options
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Add selected class to clicked option
    event.target.closest('.payment-option').classList.add('selected');

    selectedPaymentMethod = method;
    console.log('Selected payment method:', method);
}

async function processPayment() {
    if (!selectedPaymentMethod) {
        showAlert('Please select a payment method', 'error');
        return;
    }

    // Show processing state
    const payButton = document.getElementById('payButton');
    const originalText = payButton.textContent;
    payButton.textContent = 'Processing...';
    payButton.disabled = true;

    try {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create order object
        const orderData = {
            customerId: localStorage.getItem('userId'),
            customerName: localStorage.getItem('username'),
            items: checkoutData.cart,
            orderType: checkoutData.orderType,
            paymentMethod: selectedPaymentMethod,
            subtotal: parseFloat(document.getElementById('subtotal').textContent.replace('₹', '')),
            tax: parseFloat(document.getElementById('tax').textContent.replace('₹', '')),
            deliveryFee: parseFloat(document.getElementById('deliveryFee').textContent.replace('₹', '')),
            grandTotal: parseFloat(document.getElementById('total').textContent.replace('₹', '')),
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            ...(checkoutData.orderType === 'pickup' && { tableNumber: checkoutData.tableNumber }),
            ...(checkoutData.orderType === 'delivery' && { deliveryAddress: checkoutData.deliveryAddress }),
            ...(checkoutData.notes && { notes: checkoutData.notes })
        };

        // Submit order to backend
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Failed to submit order');
        }

        const result = await response.json();
        console.log('Order submitted:', result);

        // Clear cart and checkout data
        localStorage.removeItem('cart');
        localStorage.removeItem('checkoutData');

        // Show success modal
        showOrderSuccess(result.order);

    } catch (error) {
        console.error('Payment processing error:', error);
        showAlert('Payment failed. Please try again.', 'error');
    } finally {
        payButton.textContent = originalText;
        payButton.disabled = false;
    }
}

function showOrderSuccess(order) {
    document.getElementById('successOrderId').textContent = order.id;
    document.getElementById('successOrderTotal').textContent = `₹${order.total.toFixed(2)}`;
    document.getElementById('successModal').style.display = 'block';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
    window.location.href = 'customer-order.html';
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

