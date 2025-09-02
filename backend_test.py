#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Shopify Clone
Tests all backend functionality including multi-tenancy, CRUD operations, and data validation
"""

import requests
import json
import uuid
import time
import io
import os
from typing import Dict, List, Any

# Configuration
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get base URL from environment
NEXT_PUBLIC_BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
BASE_URL = f"{NEXT_PUBLIC_BASE_URL}/api"

print(f"Using base URL: {BASE_URL}")  # Debug print

class ShopifyCloneAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_stores = []
        self.test_products = []
        self.test_orders = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            self.log(f"{method} {endpoint} -> Status: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                return {
                    'status_code': response.status_code,
                    'data': response.json(),
                    'success': 200 <= response.status_code < 300
                }
            else:
                return {
                    'status_code': response.status_code,
                    'data': response.text,
                    'success': 200 <= response.status_code < 300
                }
                
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return {
                'status_code': 0,
                'data': {'error': str(e)},
                'success': False
            }
    
    def test_api_health(self) -> bool:
        """Test if API is responding"""
        self.log("Testing API health check...")
        
        result = self.make_request('GET', '')
        if result['success']:
            self.log("✅ API health check passed")
            return True
        else:
            self.log("❌ API health check failed", "ERROR")
            return False
    
    def test_store_management(self) -> bool:
        """Test store creation, listing, and retrieval"""
        self.log("Testing Store Management APIs...")
        
        # Test store creation
        timestamp = int(time.time())
        store_data = {
            "name": f"Test Electronics Store {timestamp}",
            "description": "A test store for electronics and gadgets",
            "domain": f"electronics-test-{timestamp}.com"
        }
        
        result = self.make_request('POST', '/stores', store_data)
        if not result['success']:
            self.log("❌ Store creation failed", "ERROR")
            return False
            
        store = result['data']
        self.test_stores.append(store)
        self.log(f"✅ Store created: {store['name']} (ID: {store['id']})")
        
        # Test duplicate store name
        result = self.make_request('POST', '/stores', store_data)
        if result['status_code'] != 400:
            self.log("❌ Duplicate store name validation failed", "ERROR")
            return False
        self.log("✅ Duplicate store name properly rejected")
        
        # Create second store for multi-tenancy testing
        store_data2 = {
            "name": f"Test Fashion Boutique {timestamp}",
            "description": "A test store for fashion items",
            "domain": f"fashion-test-{timestamp}.com"
        }
        
        result = self.make_request('POST', '/stores', store_data2)
        if not result['success']:
            self.log("❌ Second store creation failed", "ERROR")
            return False
            
        store2 = result['data']
        self.test_stores.append(store2)
        self.log(f"✅ Second store created: {store2['name']} (ID: {store2['id']})")
        
        # Test store listing
        result = self.make_request('GET', '/stores')
        if not result['success']:
            self.log("❌ Store listing failed", "ERROR")
            return False
            
        stores = result['data']
        if len(stores) < 2:
            self.log("❌ Store listing doesn't show created stores", "ERROR")
            return False
        self.log(f"✅ Store listing returned {len(stores)} stores")
        
        # Test individual store retrieval
        result = self.make_request('GET', f'/stores/{store["id"]}')
        if not result['success']:
            self.log("❌ Individual store retrieval failed", "ERROR")
            return False
            
        retrieved_store = result['data']
        if retrieved_store['id'] != store['id']:
            self.log("❌ Retrieved store ID mismatch", "ERROR")
            return False
        self.log("✅ Individual store retrieval successful")
        
        # Test non-existent store
        fake_id = str(uuid.uuid4())
        result = self.make_request('GET', f'/stores/{fake_id}')
        if result['status_code'] != 404:
            self.log("❌ Non-existent store should return 404", "ERROR")
            return False
        self.log("✅ Non-existent store properly returns 404")
        
        return True
    
    def test_product_crud(self) -> bool:
        """Test product CRUD operations with multi-tenancy"""
        self.log("Testing Product CRUD APIs...")
        
        if len(self.test_stores) < 2:
            self.log("❌ Need at least 2 stores for product testing", "ERROR")
            return False
            
        store1_id = self.test_stores[0]['id']
        store2_id = self.test_stores[1]['id']
        
        # Test product creation in store 1
        product_data = {
            "name": "iPhone 15 Pro",
            "description": "Latest iPhone with advanced features",
            "price": 999.99,
            "inventory": 50,
            "images": ["iphone15pro.jpg"]
        }
        
        result = self.make_request('POST', f'/products/{store1_id}', product_data)
        if not result['success']:
            self.log("❌ Product creation failed", "ERROR")
            return False
            
        product1 = result['data']
        self.test_products.append(product1)
        self.log(f"✅ Product created in store 1: {product1['name']} (ID: {product1['id']})")
        
        # Test product creation in store 2
        product_data2 = {
            "name": "Designer Jacket",
            "description": "Premium leather jacket",
            "price": 299.99,
            "inventory": 25,
            "images": ["jacket.jpg"]
        }
        
        result = self.make_request('POST', f'/products/{store2_id}', product_data2)
        if not result['success']:
            self.log("❌ Product creation in store 2 failed", "ERROR")
            return False
            
        product2 = result['data']
        self.test_products.append(product2)
        self.log(f"✅ Product created in store 2: {product2['name']} (ID: {product2['id']})")
        
        # Test duplicate product name within same store
        result = self.make_request('POST', f'/products/{store1_id}', product_data)
        if result['status_code'] != 400:
            self.log("❌ Duplicate product name validation failed", "ERROR")
            return False
        self.log("✅ Duplicate product name properly rejected")
        
        # Test product creation with missing required fields
        invalid_product = {"description": "Missing name and price"}
        result = self.make_request('POST', f'/products/{store1_id}', invalid_product)
        if result['status_code'] != 400:
            self.log("❌ Invalid product data validation failed", "ERROR")
            return False
        self.log("✅ Invalid product data properly rejected")
        
        # Test product creation in non-existent store
        fake_store_id = str(uuid.uuid4())
        result = self.make_request('POST', f'/products/{fake_store_id}', product_data)
        if result['status_code'] != 404:
            self.log("❌ Product creation in non-existent store should return 404", "ERROR")
            return False
        self.log("✅ Product creation in non-existent store properly returns 404")
        
        # Test product listing for store 1
        result = self.make_request('GET', f'/products/{store1_id}')
        if not result['success']:
            self.log("❌ Product listing for store 1 failed", "ERROR")
            return False
            
        store1_products = result['data']['products']
        if len(store1_products) == 0:
            self.log("❌ Store 1 should have products", "ERROR")
            return False
        self.log(f"✅ Store 1 product listing returned {len(store1_products)} products")
        
        # Test product listing for store 2
        result = self.make_request('GET', f'/products/{store2_id}')
        if not result['success']:
            self.log("❌ Product listing for store 2 failed", "ERROR")
            return False
            
        store2_products = result['data']['products']
        if len(store2_products) == 0:
            self.log("❌ Store 2 should have products", "ERROR")
            return False
        self.log(f"✅ Store 2 product listing returned {len(store2_products)} products")
        
        # Test multi-tenancy: ensure products don't leak between stores
        store1_product_ids = [p['id'] for p in store1_products]
        store2_product_ids = [p['id'] for p in store2_products]
        
        if any(pid in store2_product_ids for pid in store1_product_ids):
            self.log("❌ Product multi-tenancy violation: products leaked between stores", "ERROR")
            return False
        self.log("✅ Product multi-tenancy isolation verified")
        
        # Test product search
        result = self.make_request('GET', f'/products/{store1_id}', params={'search': 'iPhone'})
        if not result['success']:
            self.log("❌ Product search failed", "ERROR")
            return False
            
        search_results = result['data']['products']
        if len(search_results) == 0:
            self.log("❌ Product search should return results", "ERROR")
            return False
        self.log(f"✅ Product search returned {len(search_results)} results")
        
        # Test product pagination
        result = self.make_request('GET', f'/products/{store1_id}', params={'page': 1, 'limit': 1})
        if not result['success']:
            self.log("❌ Product pagination failed", "ERROR")
            return False
            
        paginated_results = result['data']
        if 'meta' not in paginated_results:
            self.log("❌ Product pagination should include meta information", "ERROR")
            return False
        self.log("✅ Product pagination working correctly")
        
        # Test product update
        update_data = {
            "name": "iPhone 15 Pro Max",
            "price": 1199.99,
            "inventory": 30
        }
        
        result = self.make_request('PUT', f'/products/{store1_id}/product/{product1["id"]}', update_data)
        if not result['success']:
            self.log("❌ Product update failed", "ERROR")
            return False
            
        updated_product = result['data']
        if updated_product['name'] != update_data['name']:
            self.log("❌ Product update didn't apply changes", "ERROR")
            return False
        self.log("✅ Product update successful")
        
        # Test product update in wrong store (multi-tenancy)
        result = self.make_request('PUT', f'/products/{store2_id}/product/{product1["id"]}', update_data)
        if result['status_code'] != 404:
            self.log("❌ Product update across stores should return 404", "ERROR")
            return False
        self.log("✅ Cross-store product update properly blocked")
        
        # Test product deletion
        result = self.make_request('DELETE', f'/products/{store1_id}/product/{product1["id"]}')
        if not result['success']:
            self.log("❌ Product deletion failed", "ERROR")
            return False
        self.log("✅ Product deletion successful")
        
        # Test deletion of non-existent product
        fake_product_id = str(uuid.uuid4())
        result = self.make_request('DELETE', f'/products/{store1_id}/product/{fake_product_id}')
        if result['status_code'] != 404:
            self.log("❌ Non-existent product deletion should return 404", "ERROR")
            return False
        self.log("✅ Non-existent product deletion properly returns 404")
        
        return True
    
    def test_order_management(self) -> bool:
        """Test order creation and management"""
        self.log("Testing Order Management APIs...")
        
        if len(self.test_stores) < 1:
            self.log("❌ Need stores for order testing", "ERROR")
            return False
            
        store_id = self.test_stores[0]['id']
        
        # Create fresh products for order testing
        product_data1 = {
            "name": "Order Test Product 1",
            "description": "Product for order testing",
            "price": 99.99,
            "inventory": 10,
            "images": ["product1.jpg"]
        }
        
        product_data2 = {
            "name": "Order Test Product 2", 
            "description": "Second product for order testing",
            "price": 199.99,
            "inventory": 5,
            "images": ["product2.jpg"]
        }
        
        result1 = self.make_request('POST', f'/products/{store_id}', product_data1)
        result2 = self.make_request('POST', f'/products/{store_id}', product_data2)
        
        if not (result1['success'] and result2['success']):
            self.log("❌ Product creation for order test failed", "ERROR")
            return False
            
        product1 = result1['data']
        product2 = result2['data']
        
        # Test order creation with multiple items
        order_data = {
            "items": [
                {
                    "productId": product1['id'],
                    "quantity": 2
                },
                {
                    "productId": product2['id'],
                    "quantity": 1
                }
            ],
            "customerInfo": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "address": "123 Main St, City, State 12345"
            }
        }
        
        result = self.make_request('POST', f'/orders/{store_id}', order_data)
        if not result['success']:
            self.log("❌ Order creation failed", "ERROR")
            return False
            
        order = result['data']
        self.test_orders.append(order)
        self.log(f"✅ Order created: {order['orderNumber']} (ID: {order['id']})")
        
        # Verify order total calculation
        if 'total' not in order or order['total'] <= 0:
            self.log("❌ Order total not calculated correctly", "ERROR")
            return False
        self.log(f"✅ Order total calculated: ${order['total']}")
        
        # Test order creation with invalid data
        invalid_order = {"items": []}
        result = self.make_request('POST', f'/orders/{store_id}', invalid_order)
        if result['status_code'] != 400:
            self.log("❌ Invalid order data validation failed", "ERROR")
            return False
        self.log("✅ Invalid order data properly rejected")
        
        # Test order creation with non-existent product
        invalid_order_data = {
            "items": [
                {
                    "productId": str(uuid.uuid4()),
                    "quantity": 1
                }
            ],
            "customerInfo": {"name": "Test Customer"}
        }
        
        result = self.make_request('POST', f'/orders/{store_id}', invalid_order_data)
        if result['status_code'] != 400:
            self.log("❌ Order with non-existent product should return 400", "ERROR")
            return False
        self.log("✅ Order with non-existent product properly rejected")
        
        # Test order creation in non-existent store
        fake_store_id = str(uuid.uuid4())
        result = self.make_request('POST', f'/orders/{fake_store_id}', order_data)
        if result['status_code'] != 404:
            self.log("❌ Order creation in non-existent store should return 404", "ERROR")
            return False
        self.log("✅ Order creation in non-existent store properly returns 404")
        
        # Test order listing
        result = self.make_request('GET', f'/orders/{store_id}')
        if not result['success']:
            self.log("❌ Order listing failed", "ERROR")
            return False
            
        orders = result['data']['orders']
        if len(orders) == 0:
            self.log("❌ Order listing should return created orders", "ERROR")
            return False
        self.log(f"✅ Order listing returned {len(orders)} orders")
        
        # Test order status filtering
        result = self.make_request('GET', f'/orders/{store_id}', params={'status': 'pending'})
        if not result['success']:
            self.log("❌ Order status filtering failed", "ERROR")
            return False
        self.log("✅ Order status filtering working")
        
        # Test order status update
        status_update = {"status": "processing"}
        result = self.make_request('PUT', f'/orders/{store_id}/order/{order["id"]}', status_update)
        if not result['success']:
            self.log("❌ Order status update failed", "ERROR")
            return False
            
        updated_order = result['data']
        if updated_order['status'] != 'processing':
            self.log("❌ Order status not updated correctly", "ERROR")
            return False
        self.log("✅ Order status update successful")
        
        # Test order update with missing status
        result = self.make_request('PUT', f'/orders/{store_id}/order/{order["id"]}', {})
        if result['status_code'] != 400:
            self.log("❌ Order update without status should return 400", "ERROR")
            return False
        self.log("✅ Order update without status properly rejected")
        
        # Test order update for non-existent order
        fake_order_id = str(uuid.uuid4())
        result = self.make_request('PUT', f'/orders/{store_id}/order/{fake_order_id}', status_update)
        if result['status_code'] != 404:
            self.log("❌ Non-existent order update should return 404", "ERROR")
            return False
        self.log("✅ Non-existent order update properly returns 404")
        
        return True
    
    def test_storefront_api(self) -> bool:
        """Test public storefront API"""
        self.log("Testing Storefront API...")
        
        if len(self.test_stores) < 1:
            self.log("❌ Need stores for storefront testing", "ERROR")
            return False
            
        store = self.test_stores[0]
        store_slug = store['slug']
        
        # Test storefront data retrieval
        result = self.make_request('GET', f'/storefront/{store_slug}')
        if not result['success']:
            self.log("❌ Storefront data retrieval failed", "ERROR")
            return False
            
        storefront_data = result['data']
        if 'store' not in storefront_data or 'products' not in storefront_data:
            self.log("❌ Storefront data should include store and products", "ERROR")
            return False
            
        if storefront_data['store']['id'] != store['id']:
            self.log("❌ Storefront returned wrong store data", "ERROR")
            return False
        self.log(f"✅ Storefront data retrieved for {store['name']}")
        
        # Test storefront with non-existent slug
        fake_slug = "non-existent-store"
        result = self.make_request('GET', f'/storefront/{fake_slug}')
        if result['status_code'] != 404:
            self.log("❌ Non-existent storefront should return 404", "ERROR")
            return False
        self.log("✅ Non-existent storefront properly returns 404")
        
        return True
    
    def test_multi_tenancy_isolation(self) -> bool:
        """Test multi-tenancy isolation across all resources"""
        self.log("Testing Multi-Tenancy Isolation...")
        
        if len(self.test_stores) < 2:
            self.log("❌ Need at least 2 stores for multi-tenancy testing", "ERROR")
            return False
            
        store1_id = self.test_stores[0]['id']
        store2_id = self.test_stores[1]['id']
        
        # Create products in both stores
        product1_data = {
            "name": "Store1 Exclusive Product",
            "description": "Only available in store 1",
            "price": 100.00,
            "inventory": 10
        }
        
        product2_data = {
            "name": "Store2 Exclusive Product", 
            "description": "Only available in store 2",
            "price": 200.00,
            "inventory": 20
        }
        
        # Create products
        result1 = self.make_request('POST', f'/products/{store1_id}', product1_data)
        result2 = self.make_request('POST', f'/products/{store2_id}', product2_data)
        
        if not (result1['success'] and result2['success']):
            self.log("❌ Failed to create test products for multi-tenancy test", "ERROR")
            return False
            
        store1_product = result1['data']
        store2_product = result2['data']
        
        # Test that store1 products don't appear in store2
        result = self.make_request('GET', f'/products/{store2_id}')
        if not result['success']:
            self.log("❌ Failed to get store2 products", "ERROR")
            return False
            
        store2_products = result['data']['products']
        store1_product_in_store2 = any(p['id'] == store1_product['id'] for p in store2_products)
        
        if store1_product_in_store2:
            self.log("❌ Store1 product found in store2 - multi-tenancy violation!", "ERROR")
            return False
        self.log("✅ Products properly isolated between stores")
        
        # Create orders in both stores
        order1_data = {
            "items": [{"productId": store1_product['id'], "quantity": 1}],
            "customerInfo": {"name": "Store1 Customer"}
        }
        
        order2_data = {
            "items": [{"productId": store2_product['id'], "quantity": 1}],
            "customerInfo": {"name": "Store2 Customer"}
        }
        
        result1 = self.make_request('POST', f'/orders/{store1_id}', order1_data)
        result2 = self.make_request('POST', f'/orders/{store2_id}', order2_data)
        
        if not (result1['success'] and result2['success']):
            self.log("❌ Failed to create test orders for multi-tenancy test", "ERROR")
            return False
            
        store1_order = result1['data']
        store2_order = result2['data']
        
        # Test that store1 orders don't appear in store2
        result = self.make_request('GET', f'/orders/{store2_id}')
        if not result['success']:
            self.log("❌ Failed to get store2 orders", "ERROR")
            return False
            
        store2_orders = result['data']['orders']
        store1_order_in_store2 = any(o['id'] == store1_order['id'] for o in store2_orders)
        
        if store1_order_in_store2:
            self.log("❌ Store1 order found in store2 - multi-tenancy violation!", "ERROR")
            return False
        self.log("✅ Orders properly isolated between stores")
        
        # Test cross-store product access in orders (should fail)
        cross_store_order = {
            "items": [{"productId": store1_product['id'], "quantity": 1}],
            "customerInfo": {"name": "Cross Store Customer"}
        }
        
        result = self.make_request('POST', f'/orders/{store2_id}', cross_store_order)
        if result['success']:
            self.log("❌ Cross-store product order should fail - multi-tenancy violation!", "ERROR")
            return False
        self.log("✅ Cross-store product access properly blocked")
        
        return True
    
    def create_test_image(self, filename: str = "test_image.jpg", size: tuple = (100, 100)) -> bytes:
        """Create a simple test image in memory"""
        try:
            from PIL import Image
            # Create a simple colored image
            img = Image.new('RGB', size, color='red')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            return img_bytes.getvalue()
        except ImportError:
            # Fallback: create a minimal JPEG header for testing
            # This is a minimal valid JPEG file (1x1 pixel)
            return bytes([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
                0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
                0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
                0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
                0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
                0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
                0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
                0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
                0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
                0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
                0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
                0x07, 0xFF, 0xD9
            ])
    
    def make_upload_request(self, endpoint: str, files: Dict, data: Dict = None) -> Dict:
        """Make file upload request with multipart/form-data"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            # Remove Content-Type header for multipart requests
            headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
            
            response = requests.post(url, files=files, data=data, headers=headers)
            
            self.log(f"POST {endpoint} (upload) -> Status: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                return {
                    'status_code': response.status_code,
                    'data': response.json(),
                    'success': 200 <= response.status_code < 300
                }
            else:
                return {
                    'status_code': response.status_code,
                    'data': response.text,
                    'success': 200 <= response.status_code < 300
                }
                
        except requests.exceptions.RequestException as e:
            self.log(f"Upload request failed: {str(e)}", "ERROR")
            return {
                'status_code': 0,
                'data': {'error': str(e)},
                'success': False
            }
    
    def test_image_upload_functionality(self) -> bool:
        """Test comprehensive image upload functionality"""
        self.log("Testing Image Upload Functionality...")
        
        if len(self.test_stores) < 2:
            self.log("❌ Need at least 2 stores for image upload testing", "ERROR")
            return False
            
        store1_id = self.test_stores[0]['id']
        store2_id = self.test_stores[1]['id']
        
        # Test 1: Single image upload
        self.log("Testing single image upload...")
        test_image1 = self.create_test_image("test1.jpg")
        
        files = {
            'images': ('test1.jpg', io.BytesIO(test_image1), 'image/jpeg')
        }
        
        result = self.make_upload_request(f'/upload/{store1_id}', files)
        if not result['success']:
            self.log("❌ Single image upload failed", "ERROR")
            return False
            
        upload_response = result['data']
        if 'images' not in upload_response or len(upload_response['images']) != 1:
            self.log("❌ Upload response should contain images array", "ERROR")
            return False
            
        uploaded_image = upload_response['images'][0]
        if 'url' not in uploaded_image or 'filename' not in uploaded_image:
            self.log("❌ Uploaded image should have url and filename", "ERROR")
            return False
            
        self.log(f"✅ Single image uploaded: {uploaded_image['filename']}")
        
        # Test 2: Multiple image upload
        self.log("Testing multiple image upload...")
        test_image2 = self.create_test_image("test2.jpg")
        test_image3 = self.create_test_image("test3.png")
        
        files = [
            ('images', ('test2.jpg', io.BytesIO(test_image2), 'image/jpeg')),
            ('images', ('test3.png', io.BytesIO(test_image3), 'image/png'))
        ]
        
        result = self.make_upload_request(f'/upload/{store1_id}', files)
        if not result['success']:
            self.log("❌ Multiple image upload failed", "ERROR")
            return False
            
        upload_response = result['data']
        if len(upload_response['images']) != 2:
            self.log("❌ Multiple upload should return 2 images", "ERROR")
            return False
            
        self.log("✅ Multiple images uploaded successfully")
        
        # Test 3: Upload to different store (multi-store isolation)
        self.log("Testing multi-store image isolation...")
        test_image4 = self.create_test_image("store2_test.jpg")
        
        files = {
            'images': ('store2_test.jpg', io.BytesIO(test_image4), 'image/jpeg')
        }
        
        result = self.make_upload_request(f'/upload/{store2_id}', files)
        if not result['success']:
            self.log("❌ Upload to second store failed", "ERROR")
            return False
            
        store2_upload = result['data']['images'][0]
        
        # Verify filename contains store ID for isolation
        if store2_id not in store2_upload['filename']:
            self.log("❌ Uploaded filename should contain store ID for isolation", "ERROR")
            return False
            
        self.log("✅ Multi-store image isolation verified")
        
        # Test 4: Upload validation - no files
        self.log("Testing upload validation - no files...")
        result = self.make_upload_request(f'/upload/{store1_id}', {})
        if result['status_code'] != 400:
            self.log("❌ Upload with no files should return 400", "ERROR")
            return False
            
        self.log("✅ No files upload properly rejected")
        
        # Test 5: Upload to non-existent store
        self.log("Testing upload to non-existent store...")
        fake_store_id = str(uuid.uuid4())
        files = {
            'images': ('test.jpg', io.BytesIO(test_image1), 'image/jpeg')
        }
        
        result = self.make_upload_request(f'/upload/{fake_store_id}', files)
        if result['status_code'] != 404:
            self.log("❌ Upload to non-existent store should return 404", "ERROR")
            return False
            
        self.log("✅ Upload to non-existent store properly rejected")
        
        # Test 6: Create product with uploaded images
        self.log("Testing product creation with uploaded images...")
        product_data = {
            "name": "Product with Images",
            "description": "A product that has uploaded images",
            "price": 199.99,
            "inventory": 10,
            "images": [uploaded_image['url']]  # Use uploaded image URL
        }
        
        result = self.make_request('POST', f'/products/{store1_id}', product_data)
        if not result['success']:
            self.log("❌ Product creation with images failed", "ERROR")
            return False
            
        product_with_images = result['data']
        if 'images' not in product_with_images or len(product_with_images['images']) != 1:
            self.log("❌ Product should have images array", "ERROR")
            return False
            
        self.log("✅ Product created with uploaded images")
        
        # Test 7: Verify product images in product listing
        self.log("Testing product images in listing...")
        result = self.make_request('GET', f'/products/{store1_id}')
        if not result['success']:
            self.log("❌ Product listing failed", "ERROR")
            return False
            
        products = result['data']['products']
        product_found = False
        for product in products:
            if product['id'] == product_with_images['id']:
                if 'images' in product and len(product['images']) > 0:
                    product_found = True
                    break
                    
        if not product_found:
            self.log("❌ Product with images not found in listing", "ERROR")
            return False
            
        self.log("✅ Product images verified in listing")
        
        # Test 8: Verify images in storefront
        self.log("Testing images in storefront...")
        store_slug = self.test_stores[0]['slug']
        result = self.make_request('GET', f'/storefront/{store_slug}')
        if not result['success']:
            self.log("❌ Storefront retrieval failed", "ERROR")
            return False
            
        storefront_data = result['data']
        storefront_products = storefront_data['products']
        
        product_with_images_found = False
        for product in storefront_products:
            if product['id'] == product_with_images['id']:
                if 'images' in product and len(product['images']) > 0:
                    product_with_images_found = True
                    break
                    
        if not product_with_images_found:
            self.log("❌ Product with images not found in storefront", "ERROR")
            return False
            
        self.log("✅ Product images verified in storefront")
        
        # Test 9: File storage structure verification
        self.log("Testing file storage structure...")
        # Check if files are stored with proper naming convention
        if not (store1_id in uploaded_image['filename'] and '_' in uploaded_image['filename']):
            self.log("❌ File naming convention should include store ID and timestamp", "ERROR")
            return False
                
        self.log("✅ File storage structure verified")
        
        return True
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all backend tests and return results"""
        self.log("Starting Comprehensive Backend API Tests...")
        self.log("=" * 60)
        
        test_results = {}
        
        # Test API Health
        test_results['api_health'] = self.test_api_health()
        
        # Test Store Management
        test_results['store_management'] = self.test_store_management()
        
        # Test Product CRUD
        test_results['product_crud'] = self.test_product_crud()
        
        # Test Order Management
        test_results['order_management'] = self.test_order_management()
        
        # Test Storefront API
        test_results['storefront_api'] = self.test_storefront_api()
        
        # Test Multi-tenancy Isolation
        test_results['multi_tenancy'] = self.test_multi_tenancy_isolation()
        
        # Test Image Upload Functionality
        test_results['image_upload'] = self.test_image_upload_functionality()
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY:")
        
        passed_tests = 0
        total_tests = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed_tests += 1
        
        self.log(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL BACKEND TESTS PASSED!")
        else:
            self.log("⚠️  Some backend tests failed - check logs above")
        
        return test_results

def main():
    """Main test execution"""
    tester = ShopifyCloneAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()