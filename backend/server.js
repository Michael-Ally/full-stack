const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for users and OTPs (in production, use a database)
let users = [];
let generatedOtps = {}; // { phone: { otp, timestamp } }
let products = [];
let orders = [];
let tables = [];

// Load users from file on startup
const usersFile = path.join(__dirname, 'data', 'users.json');
if (fs.existsSync(usersFile)) {
    try {
        users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        console.log('Users loaded from file');
    } catch (e) {
        console.log('Could not load users file, starting fresh');
    }
}

// Load products from file on startup
const productsFile = path.join(__dirname, 'data', 'products.json');
if (fs.existsSync(productsFile)) {
    try {
        products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        console.log('Products loaded from file');
    } catch (e) {
        console.log('Could not load products file, starting fresh');
    }
}

// Load orders from file on startup
const ordersFile = path.join(__dirname, 'data', 'orders.json');
if (fs.existsSync(ordersFile)) {
    try {
        orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        console.log('Orders loaded from file');
    } catch (e) {
        console.log('Could not load orders file, starting fresh');
    }
}

// Load tables from file on startup
const tablesFile = path.join(__dirname, 'data', 'tables.json');
if (fs.existsSync(tablesFile)) {
    try {
        tables = JSON.parse(fs.readFileSync(tablesFile, 'utf8'));
        console.log('Tables loaded from file');
    } catch (e) {
        console.log('Could not load tables file, starting fresh');
    }
}

// Helper function to save users to file
function saveUsers() {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Helper function to save products to file
function saveProducts() {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

// Helper function to save orders to file
function saveOrders() {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

// Helper function to save tables to file
function saveTables() {
    fs.writeFileSync(tablesFile, JSON.stringify(tables, null, 2));
}

// Helper function to generate mock OTP
function generateMockOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to validate OTP (check if not expired - 10 minutes)
function isOtpValid(phone) {
    if (!generatedOtps[phone]) return false;
    const now = Date.now();
    const otpTime = generatedOtps[phone].timestamp;
    const isValid = (now - otpTime) < (10 * 60 * 1000); // 10 minutes
    return isValid;
}

/* ==================== SIGNUP ENDPOINTS ==================== */

// POST /api/signup/send-otp
// Generates and sends mock OTP for signup
app.post('/api/signup/send-otp', (req, res) => {
    try {
        const { username, phone, role } = req.body;

        // Validation
        if (!username || !phone || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, phone, and role are required!' 
            });
        }

        // Check if phone already registered
        const phoneExists = users.find(u => u.phone === phone);
        if (phoneExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number already registered!' 
            });
        }

        // Generate OTP
        const otp = generateMockOtp();
        generatedOtps[phone] = {
            otp,
            username,
            role,
            timestamp: Date.now(),
            type: 'signup'
        };

        console.log('Signup OTP for ' + phone + ': ' + otp);

        res.json({
            success: true,
            message: 'OTP sent successfully! (Mock: ' + otp + ')',
            mockOtp: otp // For testing purposes - remove in production
        });
    } catch (error) {
        console.error('Error in send-otp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending OTP: ' + error.message 
        });
    }
});

// POST /api/signup/verify-otp
// Verifies OTP and creates user account
app.post('/api/signup/verify-otp', (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Validation
        if (!phone || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone and OTP are required!' 
            });
        }

        // Check if OTP exists and is valid
        if (!generatedOtps[phone]) {
            return res.status(400).json({ 
                success: false, 
                message: 'OTP not found! Please request a new OTP.' 
            });
        }

        // Check if OTP is correct
        if (generatedOtps[phone].otp !== otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid OTP!' 
            });
        }

        // Check if OTP is expired
        if (!isOtpValid(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'OTP expired! Please request a new one.' 
            });
        }

        // Create new user
        const newUser = {
            id: Date.now(),
            username: generatedOtps[phone].username,
            phone: phone,
            role: generatedOtps[phone].role,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers();

        // Clean up OTP
        delete generatedOtps[phone];

        console.log('User created:', newUser);

        res.json({
            success: true,
            message: 'Account created successfully!',
            user: newUser
        });
    } catch (error) {
        console.error('Error in verify-otp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying OTP: ' + error.message 
        });
    }
});

/* ==================== LOGIN ENDPOINTS ==================== */

// POST /api/login/send-otp
// Sends OTP to registered phone number for login
app.post('/api/login/send-otp', (req, res) => {
    try {
        const { phone, role } = req.body;

        // Validation
        if (!phone || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone and role are required!' 
            });
        }

        // Find user by phone and role
        const user = users.find(u => u.phone === phone && u.role === role);
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number not found for this role!' 
            });
        }

        // Generate OTP
        const otp = generateMockOtp();
        generatedOtps[phone] = {
            otp,
            userId: user.id,
            username: user.username,
            role: user.role,
            timestamp: Date.now(),
            type: 'login'
        };

        console.log('Login OTP for ' + phone + ': ' + otp);

        res.json({
            success: true,
            message: 'OTP sent successfully! (Mock: ' + otp + ')',
            mockOtp: otp // For testing purposes - remove in production
        });
    } catch (error) {
        console.error('Error in send-otp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending OTP: ' + error.message 
        });
    }
});

// POST /api/login/verify-otp
// Verifies OTP and creates session token
app.post('/api/login/verify-otp', (req, res) => {
    try {
        const { phone, otp, role } = req.body;

        // Validation
        if (!phone || !otp || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone, OTP, and role are required!' 
            });
        }

        // Check if OTP exists
        if (!generatedOtps[phone]) {
            return res.status(400).json({ 
                success: false, 
                message: 'OTP not found! Please request a new OTP.' 
            });
        }

        // Check if OTP is correct
        if (generatedOtps[phone].otp !== otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid OTP!' 
            });
        }

        // Check if OTP is expired
        if (!isOtpValid(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'OTP expired! Please request a new one.' 
            });
        }

        // Find user
        const user = users.find(u => u.phone === phone && u.role === role);
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'User not found!' 
            });
        }

        // Clean up OTP
        delete generatedOtps[phone];

        // Create session token (in production, use JWT)
        const token = Buffer.from(JSON.stringify({
            userId: user.id,
            username: user.username,
            phone: user.phone,
            role: user.role,
            iat: Date.now()
        })).toString('base64');

        console.log('User logged in:', user.username);

        res.json({
            success: true,
            message: 'Login successful!',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error in verify-otp:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying OTP: ' + error.message 
        });
    }
});

/* ==================== PRODUCTS ENDPOINTS ==================== */

// GET /api/products
// Get all products
app.get('/api/products', (req, res) => {
    try {
        res.json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching products: ' + error.message 
        });
    }
});

// GET /api/products/:id
// Get product by ID
app.get('/api/products/:id', (req, res) => {
    try {
        const product = products.find(p => p.id === req.params.id);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        res.json({
            success: true,
            product: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching product: ' + error.message 
        });
    }
});

// POST /api/products (admin only)
// Create new product
app.post('/api/products', (req, res) => {
    try {
        const { name, sku, barcode, category, price, cost, stock, image, description } = req.body;

        // Basic validation
        if (!name || !sku || !category || price === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, SKU, category, and price are required' 
            });
        }

        // Check if SKU already exists
        const existingProduct = products.find(p => p.sku === sku);
        if (existingProduct) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product with this SKU already exists' 
            });
        }

        const newProduct = {
            id: Date.now().toString(),
            name,
            sku,
            barcode: barcode || '',
            category,
            price: parseFloat(price),
            cost: parseFloat(cost) || 0,
            stock: parseInt(stock) || 0,
            image: image || '',
            description: description || '',
            isAvailable: (parseInt(stock) || 0) > 0,
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        saveProducts();

        console.log('Product created:', newProduct.name);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating product: ' + error.message 
        });
    }
});

// PUT /api/products/:id (admin only)
// Update product
app.put('/api/products/:id', (req, res) => {
    try {
        const productIndex = products.findIndex(p => p.id === req.params.id);
        if (productIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        const { name, sku, barcode, category, price, cost, stock, image, description } = req.body;
        const updatedProduct = { ...products[productIndex] };

        if (name) updatedProduct.name = name;
        if (sku) updatedProduct.sku = sku;
        if (barcode !== undefined) updatedProduct.barcode = barcode;
        if (category) updatedProduct.category = category;
        if (price !== undefined) updatedProduct.price = parseFloat(price);
        if (cost !== undefined) updatedProduct.cost = parseFloat(cost);
        if (stock !== undefined) {
            updatedProduct.stock = parseInt(stock);
            updatedProduct.isAvailable = updatedProduct.stock > 0;
        }
        if (image !== undefined) updatedProduct.image = image;
        if (description !== undefined) updatedProduct.description = description;

        products[productIndex] = updatedProduct;
        saveProducts();

        console.log('Product updated:', updatedProduct.name);

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product: ' + error.message 
        });
    }
});

// DELETE /api/products/:id (admin only)
// Delete product
app.delete('/api/products/:id', (req, res) => {
    try {
        const productIndex = products.findIndex(p => p.id === req.params.id);
        if (productIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        const deletedProduct = products.splice(productIndex, 1)[0];
        saveProducts();

        console.log('Product deleted:', deletedProduct.name);

        res.json({
            success: true,
            message: 'Product deleted successfully',
            product: deletedProduct
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting product: ' + error.message 
        });
    }
});

/* ==================== ORDERS ENDPOINTS ==================== */

// GET /api/orders
// Get orders with optional filtering
app.get('/api/orders', (req, res) => {
    try {
        const { customerId, status, limit } = req.query;
        let filteredOrders = [...orders];

        // Filter by customer ID if provided
        if (customerId) {
            filteredOrders = filteredOrders.filter(order => order.customerId === customerId);
        }

        // Filter by status if provided (can be comma-separated)
        if (status) {
            const statusList = status.split(',');
            filteredOrders = filteredOrders.filter(order => statusList.includes(order.status));
        }

        // Sort by timestamp (newest first)
        filteredOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Limit results if specified
        if (limit) {
            filteredOrders = filteredOrders.slice(0, parseInt(limit));
        }

        res.json({
            success: true,
            orders: filteredOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders: ' + error.message
        });
    }
});

// GET /api/orders/history
// Get orders for current user
app.get('/api/orders/history', (req, res) => {
    try {
        // In a real app, get user from auth token
        // For now, return all orders (should be filtered by user)
        const userOrders = orders; // TODO: Filter by user ID from token

        res.json({
            success: true,
            orders: userOrders
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching order history: ' + error.message 
        });
    }
});

// GET /api/orders/:id
// Get order by ID
app.get('/api/orders/:id', (req, res) => {
    try {
        const order = orders.find(o => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }
        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching order: ' + error.message 
        });
    }
});

// POST /api/orders
// Create new order
app.post('/api/orders', (req, res) => {
    try {
        const { 
            customerName, 
            phone, 
            items, 
            subtotal, 
            tax, 
            deliveryFee, 
            grandTotal, 
            orderType, 
            deliveryAddress, 
            paymentMethod, 
            tableNumber, 
            notes 
        } = req.body;

        // Basic validation
        if (!items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Order must contain at least one item' 
            });
        }

        const newOrder = {
            id: 'ORD-' + Date.now(),
            customerName: customerName || 'Guest',
            phone: phone || '',
            items: items,
            subtotal: parseFloat(subtotal) || 0,
            tax: parseFloat(tax) || 0,
            deliveryFee: parseFloat(deliveryFee) || 0,
            grandTotal: parseFloat(grandTotal) || 0,
            orderType: orderType || 'pickup',
            deliveryAddress: deliveryAddress || null,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'paid', // Demo payment always succeeds
            status: 'pending',
            tableNumber: tableNumber || null,
            notes: notes || '',
            estimatedDelivery: orderType === 'delivery' ? 
                new Date(Date.now() + 30 * 60 * 1000).toISOString() : null, // 30 min for delivery
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        orders.push(newOrder);
        saveOrders();

        console.log('Order created:', newOrder.id);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: newOrder
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating order: ' + error.message 
        });
    }
});

// PUT /api/orders/:id/status
// Update order status (for staff)
app.put('/api/orders/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const orderIndex = orders.findIndex(o => o.id === req.params.id);
        
        if (orderIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        const validStatuses = ['pending', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status' 
            });
        }

        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        saveOrders();

        console.log('Order status updated:', orders[orderIndex].id, status);

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: orders[orderIndex]
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating order status: ' + error.message 
        });
    }
});

/* ==================== TABLES ENDPOINTS ==================== */

// GET /api/tables
// Get all tables
app.get('/api/tables', (req, res) => {
    try {
        res.json({
            success: true,
            tables: tables
        });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tables: ' + error.message
        });
    }
});

// PUT /api/tables/:id/status
// Update table status
app.put('/api/tables/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const tableIndex = tables.findIndex(t => t.id === req.params.id);

        if (tableIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }

        const validStatuses = ['free', 'occupied', 'reserved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be free, occupied, or reserved'
            });
        }

        tables[tableIndex].status = status;
        tables[tableIndex].updatedAt = new Date().toISOString();
        saveTables();

        console.log('Table status updated:', tables[tableIndex].id, status);

        res.json({
            success: true,
            message: 'Table status updated successfully',
            table: tables[tableIndex]
        });
    } catch (error) {
        console.error('Error updating table status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating table status: ' + error.message
        });
    }
});

/* ==================== REPORTS ENDPOINTS ==================== */

// GET /api/reports/analytics
// Get comprehensive analytics data for dashboard
app.get('/api/reports/analytics', (req, res) => {
    try {
        const { range, start, end } = req.query;

        let filteredOrders = orders;
        let dateRange = {};

        // Determine date range
        const now = new Date();
        switch (range) {
            case 'today':
                dateRange.start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                dateRange.end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                dateRange.start = weekStart;
                dateRange.end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'month':
                dateRange.start = new Date(now.getFullYear(), now.getMonth(), 1);
                dateRange.end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'custom':
                if (start && end) {
                    dateRange.start = new Date(start);
                    dateRange.end = new Date(end);
                    dateRange.end.setHours(23, 59, 59);
                }
                break;
        }

        // Filter orders by date range
        if (dateRange.start && dateRange.end) {
            filteredOrders = orders.filter(order => {
                const orderDate = new Date(order.timestamp || order.createdAt);
                return orderDate >= dateRange.start && orderDate <= dateRange.end;
            });
        }

        // Calculate metrics
        const totalOrders = filteredOrders.length;
        const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Find top product
        const productCounts = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const productName = item.name;
                productCounts[productName] = (productCounts[productName] || 0) + item.quantity;
            });
        });

        const topProduct = Object.entries(productCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

        // Sales trend data (last 7 days for simplicity)
        const salesTrend = { labels: [], data: [] };
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayOrders = filteredOrders.filter(order => {
                const orderDate = new Date(order.timestamp || order.createdAt).toISOString().split('T')[0];
                return orderDate === dateStr;
            });

            const daySales = dayOrders.reduce((sum, order) => sum + order.total, 0);

            salesTrend.labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            salesTrend.data.push(daySales);
        }

        // Top products data for pie chart
        const topProducts = { labels: [], data: [] };
        Object.entries(productCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 7)
            .forEach(([name, count]) => {
                topProducts.labels.push(name);
                topProducts.data.push(count);
            });

        res.json({
            totalSales,
            totalOrders,
            avgOrderValue,
            topProduct,
            salesTrend,
            topProducts
        });

    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating analytics: ' + error.message
        });
    }
});

// GET /api/reports/sales
// Get sales report
app.get('/api/reports/sales', (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        
        let filteredOrders = orders;
        
        // Filter by date range
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            filteredOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= start && orderDate <= end;
            });
        }

        // Calculate totals
        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const totalItems = filteredOrders.reduce((sum, o) => sum + o.items.length, 0);
        
        // Group by status
        const statusCounts = filteredOrders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
        }, {});

        // Group by payment method
        const paymentCounts = filteredOrders.reduce((acc, o) => {
            acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + 1;
            return acc;
        }, {});

        // Daily breakdown for charts
        const dailySales = {};
        filteredOrders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            if (!dailySales[date]) {
                dailySales[date] = { orders: 0, revenue: 0 };
            }
            dailySales[date].orders += 1;
            dailySales[date].revenue += order.grandTotal;
        });

        res.json({
            success: true,
            report: {
                period: period || 'custom',
                startDate: startDate || null,
                endDate: endDate || null,
                totalOrders,
                totalRevenue,
                totalItems,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                statusBreakdown: statusCounts,
                paymentBreakdown: paymentCounts,
                dailySales: Object.entries(dailySales).map(([date, data]) => ({ date, ...data }))
            }
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating sales report: ' + error.message 
        });
    }
});

// GET /api/reports/products
// Get product reports (low stock, top sellers)
app.get('/api/reports/products', (req, res) => {
    try {
        // Low stock products
        const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0);
        const outOfStockProducts = products.filter(p => p.stock === 0);

        // Top selling products (from order history)
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const productId = item.productId || item.name; // Fallback for legacy orders
                if (!productSales[productId]) {
                    productSales[productId] = { 
                        name: item.name, 
                        quantity: 0, 
                        revenue: 0 
                    };
                }
                productSales[productId].quantity += item.quantity;
                productSales[productId].revenue += item.total || (item.price * item.quantity);
            });
        });

        const topSellingProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        res.json({
            success: true,
            report: {
                lowStockProducts,
                outOfStockProducts,
                topSellingProducts
            }
        });
    } catch (error) {
        console.error('Error generating products report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating products report: ' + error.message 
        });
    }
});

/* ==================== UTILITY ENDPOINTS ==================== */

// GET /api/health
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running!',
        userCount: users.length,
        pendingOtps: Object.keys(generatedOtps).length
    });
});

// GET /api/users (for testing only)
app.get('/api/users', (req, res) => {
    res.json({ 
        users: users
    });
});

// GET /api/me - Get current logged in user info from token
app.get('/api/me', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        console.log('Token received:', token.substring(0, 20) + '...');

        // Decode token
        let decodedToken;
        try {
            const decoded = Buffer.from(token, 'base64').toString();
            decodedToken = JSON.parse(decoded);
            console.log('Token decoded:', decodedToken);
        } catch (e) {
            console.error('Failed to decode token:', e.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token format' 
            });
        }
        
        // Find user in database
        const user = users.find(u => u.id === decodedToken.userId);
        
        if (!user) {
            console.error('User not found for userId:', decodedToken.userId);
            console.error('Available user IDs:', users.map(u => u.id));
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        console.log('User found:', user.username);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error in GET /api/me:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token: ' + error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
Restaurant POS Server Running
Port: ${PORT}
API Base: http://localhost:${PORT}/api

Authentication:
POST   /api/signup/send-otp
POST   /api/signup/verify-otp
POST   /api/login/send-otp
POST   /api/login/verify-otp

Products:
GET    /api/products
GET    /api/products/:id
POST   /api/products (admin)
PUT    /api/products/:id (admin)
DELETE /api/products/:id (admin)

Orders:
GET    /api/orders
GET    /api/orders/history
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id/status

Tables:
GET    /api/tables
PUT    /api/tables/:id/status

Reports:
GET    /api/reports/sales
GET    /api/reports/products

Utility:
GET    /api/health
GET    /api/users (testing only)
    `);
});
