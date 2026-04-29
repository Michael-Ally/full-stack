// Reports Dashboard - Charts + Analytics
let salesChartInstance = null;
let productsChartInstance = null;

async function loadAnalytics() {
    // Load products for alerts
    await loadOutOfStockAlerts();
    
    // Get date range selection
    const dateRange = document.getElementById('dateRange')?.value || 'today';
    let startDate = null;
    let endDate = null;
    
    if (dateRange === 'custom') {
        startDate = document.getElementById('startDate')?.value;
        endDate = document.getElementById('endDate')?.value;
    }
    
    // Try backend API first
    let analyticsData = null;
    let backendOrders = [];
    
    try {
        let url = `http://localhost:3000/api/reports/analytics?range=${dateRange}`;
        if (dateRange === 'custom' && startDate && endDate) {
            url += `&start=${startDate}&end=${endDate}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data && typeof data.totalSales === 'number') {
            analyticsData = data;
        }
        
        // Also fetch raw orders for table
        const ordersResp = await fetch('http://localhost:3000/api/orders');
        const ordersData = await ordersResp.json();
        if (ordersData.success) {
            backendOrders = ordersData.orders;
        }
    } catch (e) {
        console.error('Backend analytics failed, falling back to localStorage:', e);
    }
    
    // Fallback to localStorage if backend has no data
    let localOrders = JSON.parse(localStorage.getItem('cashierOrders')) || [];
    
    // Use backend orders if available, otherwise localStorage
    let orders = backendOrders.length > 0 ? backendOrders : localOrders;
    
    // If we have backend analytics, use it; otherwise compute from orders
    if (analyticsData && analyticsData.totalOrders > 0) {
        updateMetricsFromBackend(analyticsData);
        renderSalesChart(analyticsData.salesTrend);
        renderProductsChart(analyticsData.topProducts);
    } else {
        computeAndRenderFromOrders(orders, dateRange, startDate, endDate);
    }
    
    // Render orders table
    renderOrdersTable(orders);
}

function updateMetricsFromBackend(data) {
    document.getElementById('totalSales').textContent = `₹${data.totalSales.toFixed(0)}`;
    document.getElementById('totalOrders').textContent = data.totalOrders;
    document.getElementById('avgOrderValue').textContent = `₹${data.avgOrderValue.toFixed(0)}`;
    document.getElementById('topProduct').textContent = data.topProduct || '--';
}

function computeAndRenderFromOrders(orders, range, startDate, endDate) {
    const now = new Date();
    let filteredOrders = orders;
    
    if (range === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        filteredOrders = orders.filter(o => {
            const d = new Date(o.timestamp || o.createdAt);
            return d.toISOString().split('T')[0] === todayStr;
        });
    } else if (range === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filteredOrders = orders.filter(o => new Date(o.timestamp || o.createdAt) >= weekAgo);
    } else if (range === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        filteredOrders = orders.filter(o => new Date(o.timestamp || o.createdAt) >= monthAgo);
    } else if (range === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        filteredOrders = orders.filter(o => {
            const d = new Date(o.timestamp || o.createdAt);
            return d >= start && d <= end;
        });
    }
    
    const totalSales = filteredOrders.reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Top product
    const productCounts = {};
    filteredOrders.forEach(o => (o.items || []).forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
    }));
    const topProduct = Object.entries(productCounts).sort(([,a], [,b]) => b - a)[0];
    
    document.getElementById('totalSales').textContent = `₹${totalSales.toFixed(0)}`;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('avgOrderValue').textContent = `₹${avgOrderValue.toFixed(0)}`;
    document.getElementById('topProduct').textContent = topProduct ? topProduct[0] : '--';
    
    // Sales trend (last 7 days)
    const salesTrend = getLast7DaysSales(orders);
    renderSalesChart(salesTrend);
    
    // Top products pie chart
    const topProducts = getTopProducts(filteredOrders, 5);
    renderProductsChart(topProducts);
}

function renderSalesChart(salesTrend) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;
    
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }
    
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: salesTrend.labels || [],
            datasets: [{
                label: 'Daily Sales (₹)',
                data: salesTrend.data || [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderProductsChart(topProducts) {
    const ctx = document.getElementById('productsChart')?.getContext('2d');
    if (!ctx) return;
    
    if (productsChartInstance) {
        productsChartInstance.destroy();
    }
    
    productsChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: topProducts.labels || [],
            datasets: [{
                data: topProducts.data || [],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Helper: Last 7 days sales
function getLast7DaysSales(orders) {
    const sales = Array(7).fill(0);
    const labels = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const dayOrders = orders.filter(o => {
            const orderDate = new Date(o.timestamp || o.createdAt).toISOString().split('T')[0];
            return orderDate === dateStr;
        });
        sales[6 - i] = dayOrders.reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0);
    }
    
    return { labels, data: sales };
}

// Helper: Top 5 products pie chart data
function getTopProducts(orders, limit = 5) {
    const productSales = {};
    orders.forEach(o => (o.items || []).forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + ((item.price || 0) * (item.quantity || 1));
    }));
    
    const sorted = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit);
    
    if (sorted.length === 0) {
        return { labels: [], data: [] };
    }
    
    const total = sorted.reduce((sum, [,s]) => sum + s, 0);
    const labels = sorted.map(([name]) => name);
    const data = sorted.map(([,s]) => ((s / total) * 100).toFixed(1));
    
    return { labels, data };
}

// Out of Stock Alerts
async function loadOutOfStockAlerts() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        const products = data.success ? data.products : data;
        
        const lowStock = products.filter(p => p.stock < 7 && p.stock >= 0);
        
        const container = document.getElementById('outOfStockAlerts');
        if (lowStock.length === 0) {
            container.innerHTML = '<p class="no-alerts"> All products have sufficient stock</p>';
            return;
        }
        
        container.innerHTML = lowStock.map(product => `
            <div class="alert-item ${product.stock === 0 ? 'alert-critical' : 'alert-warning'}">
                <div>
                    <strong>${product.name}</strong>
                    <span>Stock: ${product.stock}</span>
                </div>
                <span></span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading alerts:', error);
        document.getElementById('outOfStockAlerts').innerHTML = '<p>Error loading alerts</p>';
    }
}

// Load orders table
function renderOrdersTable(orders) {
    // Sort by newest first
    orders.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
    
    // Show latest 10 only
    const recentOrders = orders.slice(0, 10);
    
    const tbody = document.getElementById('ordersTableBody');
    if (recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No recent orders</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentOrders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.items?.[0]?.name || 'N/A'}</td>
            <td>${order.items?.length || 0} items</td>
            <td>₹${(order.total || order.grandTotal || 0).toFixed(2)}</td>
            <td><span class="status-${order.status}">${order.status?.toUpperCase() || 'PENDING'}</span></td>
            <td>${new Date(order.timestamp || order.createdAt).toLocaleString()}</td>
        </tr>
    `).join('');
}

// Date range filter change handler
document.addEventListener('DOMContentLoaded', () => {
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('change', () => {
            const isCustom = dateRange.value === 'custom';
            document.getElementById('customDateGroup').style.display = isCustom ? 'block' : 'none';
            document.getElementById('customDateGroup2').style.display = isCustom ? 'block' : 'none';
        });
    }
    
    loadAnalytics();
});

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

