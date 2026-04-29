let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
const cartItemsContainer = document.querySelector('.cart-items');

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAccess()) return;
    showUser();
    renderCart();
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

function renderCart() {
    cartItemsContainer.innerHTML = '';
    
    cartItems.forEach((item, index) => {
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        cartItemDiv.innerHTML = `
            <div class="item-img"></div>
            <div class="item-info">
                <p class="item-name">${item.quantity}x ${item.name}</p>
                <p class="item-price">₹${item.price}</p>
            </div>
            <button class="remove" onclick="removeItem(${index})">×</button>
        `;
        cartItemsContainer.appendChild(cartItemDiv);
    });
}

function removeItem(index) {
    cartItems.splice(index, 1);
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    renderCart();
}

function proceedToCheckout() {
    if (cartItems.length === 0) {
        alert('Cart is empty!');
        return;
    }
    window.location.href = 'checkout.html';
}
 // Load navigation components
fetch('header-nav.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('header-nav-placeholder').innerHTML = data;
            })
            .catch(error => console.error('Error loading header navigation:', error));

        fetch('sidebar-nav.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('sidebar-nav-placeholder').innerHTML = data;
            })
            .catch(error => console.error('Error loading sidebar navigation:', error));

// Hamburger Menu Functionality
document.addEventListener("DOMContentLoaded", function() {
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const sidebar = document.getElementById("sidebar");
    const toggleSidebar = document.getElementById("toggleSidebar");
    
    if (hamburgerMenu && sidebar && toggleSidebar) {
        // Hamburger menu toggle
        hamburgerMenu.addEventListener("click", function() {
            hamburgerMenu.classList.toggle("active");
            sidebar.classList.toggle("open");
        });
        
        // Sidebar collapse toggle
        toggleSidebar.addEventListener("click", function() {
            sidebar.classList.toggle("collapsed");
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", function(e) {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !hamburgerMenu.contains(e.target)) {
                sidebar.classList.remove("open");
                hamburgerMenu.classList.remove("active");
            }
        });
    }
});
