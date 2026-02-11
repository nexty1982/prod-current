const express = require('express');
const router = express.Router();

// Mock cart data structure
let mockCarts = [
    {
        id: 1,
        title: 'Sample Cart Item 1',
        category: 'Electronics',
        price: 299.99,
        salePrice: 249.99,
        discount: 17,
        rating: 4.5,
        saleTag: 'Sale',
        qty: 2,
        stock: 10,
        photo: '/images/products/sample1.jpg',
        created: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Sample Cart Item 2',
        category: 'Books',
        price: 29.99,
        salePrice: 24.99,
        discount: 17,
        rating: 4.2,
        saleTag: 'Sale',
        qty: 1,
        stock: 25,
        photo: '/images/products/sample2.jpg',
        created: new Date().toISOString()
    }
];

// GET /api/eCommerce/carts - Get all cart items
router.get('/carts', (req, res) => {
    try {
        res.json({ data: mockCarts });
    } catch (error) {
        console.error('Error fetching carts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/eCommerce/carts - Add item to cart
router.post('/carts', (req, res) => {
    try {
        const {
            title,
            category,
            price,
            salePrice,
            discount,
            rating,
            saleTag,
            qty = 1,
            stock,
            photo
        } = req.body;

        const newCartItem = {
            id: Math.max(...mockCarts.map(item => item.id), 0) + 1,
            title,
            category,
            price,
            salePrice,
            discount,
            rating,
            saleTag,
            qty,
            stock,
            photo,
            created: new Date().toISOString()
        };

        mockCarts.push(newCartItem);
        res.status(201).json(newCartItem);
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/eCommerce/carts/increment-decrementqty - Update cart item quantity
router.put('/carts/increment-decrementqty', (req, res) => {
    try {
        const { id, action } = req.body;

        const cartItemIndex = mockCarts.findIndex(item => item.id === parseInt(id));

        if (cartItemIndex === -1) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        if (action === 'Increment') {
            mockCarts[cartItemIndex].qty += 1;
        } else if (action === 'Decrement') {
            mockCarts[cartItemIndex].qty = Math.max(1, mockCarts[cartItemIndex].qty - 1);
        }

        res.json(mockCarts[cartItemIndex]);
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/eCommerce/carts/:id - Remove item from cart
router.delete('/carts/:id', (req, res) => {
    try {
        const { id } = req.params;
        const cartItemIndex = mockCarts.findIndex(item => item.id === parseInt(id));

        if (cartItemIndex === -1) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        const removedItem = mockCarts.splice(cartItemIndex, 1)[0];
        res.json(removedItem);
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/eCommerce/products - Get all products (mock data)
router.get('/products', (req, res) => {
    try {
        const mockProducts = [
            {
                id: 1,
                title: 'Orthodox Icons Set',
                category: 'Religious Items',
                price: 99.99,
                salePrice: 79.99,
                discount: 20,
                rating: 4.8,
                saleTag: 'Sale',
                stock: 15,
                photo: '/images/products/icons.jpg',
                description: 'Beautiful set of Orthodox icons for home worship.'
            },
            {
                id: 2,
                title: 'Prayer Book',
                category: 'Books',
                price: 24.99,
                salePrice: 19.99,
                discount: 20,
                rating: 4.6,
                saleTag: 'Sale',
                stock: 30,
                photo: '/images/products/prayer-book.jpg',
                description: 'Traditional Orthodox prayer book with daily prayers.'
            },
            {
                id: 3,
                title: 'Incense Burner',
                category: 'Religious Items',
                price: 49.99,
                salePrice: 39.99,
                discount: 20,
                rating: 4.4,
                saleTag: 'Sale',
                stock: 8,
                photo: '/images/products/incense-burner.jpg',
                description: 'Traditional Orthodox incense burner made of brass.'
            }
        ];

        res.json(mockProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/eCommerce/products/:id - Get single product
router.get('/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        // Mock product detail - you would fetch from database in real implementation
        const mockProduct = {
            id: parseInt(id),
            title: `Product ${id}`,
            category: 'Religious Items',
            price: 99.99,
            salePrice: 79.99,
            discount: 20,
            rating: 4.5,
            saleTag: 'Sale',
            stock: 10,
            photo: `/images/products/product${id}.jpg`,
            description: `Detailed description for product ${id}`,
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            reviews: [
                { id: 1, user: 'John Doe', rating: 5, comment: 'Excellent product!' },
                { id: 2, user: 'Jane Smith', rating: 4, comment: 'Very good quality.' }
            ]
        };

        res.json(mockProduct);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
