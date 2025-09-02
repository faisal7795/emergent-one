'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Store, Plus, Package, ShoppingCart, BarChart3, Settings, ExternalLink, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

function App() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Store creation form state
  const [newStore, setNewStore] = useState({
    name: '',
    description: '',
    domain: ''
  });

  // Load stores on component mount
  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data);
        if (data.length > 0 && !selectedStore) {
          setSelectedStore(data[0]);
        }
      } else {
        // Fallback to demo data if API fails
        console.log('API failed, using demo data');
        const demoStores = [
          {
            id: 'demo-store-1',
            name: 'Demo Electronics Store',
            slug: 'demo-electronics-store',
            description: 'A demo electronics store with sample products',
            domain: 'demo-electronics.com',
            isActive: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }
        ];
        setStores(demoStores);
        setSelectedStore(demoStores[0]);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      // Fallback to demo data if network fails
      const demoStores = [
        {
          id: 'demo-store-1',
          name: 'Demo Electronics Store', 
          slug: 'demo-electronics-store',
          description: 'A demo electronics store with sample products',
          domain: 'demo-electronics.com',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];
      setStores(demoStores);
      setSelectedStore(demoStores[0]);
      toast.info('Demo mode: Using sample data');
    } finally {
      setLoading(false);
    }
  };

  const createStore = async (e) => {
    e.preventDefault();
    
    if (!newStore.name.trim()) {
      toast.error('Store name is required');
      return;
    }

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStore),
      });

      if (response.ok) {
        const createdStore = await response.json();
        setStores([createdStore, ...stores]);
        setSelectedStore(createdStore);
        setNewStore({ name: '', description: '', domain: '' });
        setShowCreateStore(false);
        toast.success('Store created successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create store');
      }
    } catch (error) {
      console.error('Error creating store:', error);
      toast.error('Error creating store');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Store className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">ShopifyClone</h1>
              </div>
              
              {stores.length > 0 && (
                <select
                  value={selectedStore?.id || ''}
                  onChange={(e) => {
                    const store = stores.find(s => s.id === e.target.value);
                    setSelectedStore(store);
                  }}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <Dialog open={showCreateStore} onOpenChange={setShowCreateStore}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Store
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={createStore}>
                  <DialogHeader>
                    <DialogTitle>Create New Store</DialogTitle>
                    <DialogDescription>
                      Set up your new online store in minutes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Store Name *</Label>
                      <Input
                        id="name"
                        value={newStore.name}
                        onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                        placeholder="My Awesome Store"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newStore.description}
                        onChange={(e) => setNewStore({ ...newStore, description: e.target.value })}
                        placeholder="Describe what your store sells..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="domain">Custom Domain (Optional)</Label>
                      <Input
                        id="domain"
                        value={newStore.domain}
                        onChange={(e) => setNewStore({ ...newStore, domain: e.target.value })}
                        placeholder="mystore.com"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateStore(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Store</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {stores.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Welcome to ShopifyClone</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first online store and start selling products to customers worldwide.
            </p>
            <Button onClick={() => setShowCreateStore(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Store
            </Button>
          </div>
        ) : (
          selectedStore && (
            <div className="space-y-6">
              {/* Store Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold">{selectedStore.name}</h2>
                  {selectedStore.description && (
                    <p className="text-muted-foreground mt-1">{selectedStore.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="secondary">
                      Created {formatDate(selectedStore.createdAt)}
                    </Badge>
                    <a
                      href={`/store/${selectedStore.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center space-x-1"
                    >
                      <span>View Storefront</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <StoreOverview storeId={selectedStore.id} />
                  <AnalyticsDashboard storeId={selectedStore.id} />
                </TabsContent>

                <TabsContent value="products" className="space-y-6">
                  <ProductManagement storeId={selectedStore.id} />
                </TabsContent>

                <TabsContent value="orders" className="space-y-6">
                  <OrderManagement storeId={selectedStore.id} />
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <StoreSettings store={selectedStore} />
                </TabsContent>
              </Tabs>
            </div>
          )
        )}
      </main>
    </div>
  );
}

// Store Overview Component
function StoreOverview({ storeId }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    recentProducts: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [storeId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [productsRes, ordersRes] = await Promise.all([
        fetch(`/api/products/${storeId}?limit=5`),
        fetch(`/api/orders/${storeId}?limit=5`)
      ]);

      if (productsRes.ok && ordersRes.ok) {
        const [productsData, ordersData] = await Promise.all([
          productsRes.json(),
          ordersRes.json()
        ]);

        setStats({
          totalProducts: productsData.meta.total,
          totalOrders: ordersData.meta.total,
          recentProducts: productsData.products,
          recentOrders: ordersData.orders
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading overview...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProducts}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalOrders}</div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Products</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentProducts.length === 0 ? (
            <p className="text-muted-foreground">No products yet. Create your first product!</p>
          ) : (
            <div className="space-y-2">
              {stats.recentProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-muted-foreground">${product.price}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Product Management Component
function ProductManagement({ storeId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    inventory: '',
    images: []
  });

  useEffect(() => {
    loadProducts();
  }, [storeId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name.trim() || !newProduct.price) {
      toast.error('Product name and price are required');
      return;
    }

    try {
      const response = await fetch(`/api/products/${storeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
          inventory: parseInt(newProduct.inventory) || 0
        }),
      });

      if (response.ok) {
        const createdProduct = await response.json();
        setProducts([createdProduct, ...products]);
        setNewProduct({ name: '', description: '', price: '', inventory: '', images: [] });
        setShowCreateProduct(false);
        toast.success('Product created successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error creating product');
    }
  };

  const deleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${storeId}/product/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId));
        toast.success('Product deleted successfully!');
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Products</h3>
        <Dialog open={showCreateProduct} onOpenChange={setShowCreateProduct}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={createProduct}>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Create a new product for your store.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="productName">Product Name *</Label>
                  <Input
                    id="productName"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Product name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="productDescription">Description</Label>
                  <Textarea
                    id="productDescription"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="productPrice">Price *</Label>
                    <Input
                      id="productPrice"
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="productInventory">Inventory</Label>
                    <Input
                      id="productInventory"
                      type="number"
                      value={newProduct.inventory}
                      onChange={(e) => setNewProduct({ ...newProduct, inventory: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Product Images</Label>
                  <ImageUpload
                    storeId={storeId}
                    currentImages={newProduct.images.map(url => ({ url }))}
                    onImagesChange={(imageUrls) => setNewProduct({ ...newProduct, images: imageUrls })}
                    maxImages={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateProduct(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first product.</p>
            <Button onClick={() => setShowCreateProduct(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                {product.images && product.images.length > 0 && (
                  <div className="aspect-square relative mb-4 rounded-md overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    {product.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        +{product.images.length - 1} more
                      </div>
                    )}
                  </div>
                )}
                <CardTitle className="text-base">{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">${product.price}</span>
                  <Badge variant="secondary">
                    {product.inventory} in stock
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Order Management Component
function OrderManagement({ storeId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [storeId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`/api/orders/${storeId}/order/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
        toast.success('Order status updated!');
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Orders</h3>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground">Orders will appear here when customers make purchases.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">Order #{order.orderNumber}</CardTitle>
                    <CardDescription>
                      {new Date(order.createdAt).toLocaleDateString()} • ${order.total}
                    </CardDescription>
                  </div>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.productName}</span>
                      <span>${item.total}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Store Settings Component
function StoreSettings({ store }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Store Settings</h3>
      
      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>Basic information about your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Store Name</Label>
            <Input value={store.name} readOnly />
          </div>
          <div>
            <Label>Store Slug</Label>
            <Input value={store.slug} readOnly />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={store.description} readOnly rows={3} />
          </div>
          <div>
            <Label>Custom Domain</Label>
            <Input value={store.domain || 'Not set'} readOnly />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Dashboard Component
function AnalyticsDashboard({ storeId }) {
  const [analytics, setAnalytics] = useState({
    summary: {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      totalProducts: 0,
      conversionRate: 0
    },
    topProducts: [],
    recentOrders: [],
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [storeId, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/${storeId}?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.summary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {analytics.summary.completedOrders} completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Orders to completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best selling products by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topProducts.map((product, index) => (
                  <div key={product._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.totalQuantity} sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{product.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerInfo?.name || 'Guest'} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{order.total.toFixed(2)}</p>
                      <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;