'use client'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Store, Package, Search } from 'lucide-react';

export default function StorefrontPage() {
  const params = useParams();
  const { slug } = params;
  
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCart, setShowCart] = useState(false);
  
  // Customer info for checkout
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (slug) {
      loadStorefront();
    }
  }, [slug]);

  const loadStorefront = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/storefront/${slug}`);
      
      if (response.ok) {
        const data = await response.json();
        setStore(data.store);
        setProducts(data.products);
      } else {
        console.log('API failed, using demo storefront data');
        // Fallback to demo data when API fails
        const demoStore = {
          id: slug,
          name: slug.replace(/demo-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          slug: slug,
          description: 'Demo store with sample products for testing the storefront',
          domain: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const demoProducts = [
          {
            id: 'demo-product-1',
            name: 'Premium Wireless Headphones',
            slug: 'premium-wireless-headphones',
            description: 'High-quality wireless headphones with noise cancellation and premium sound quality',
            price: 299.99,
            inventory: 50,
            images: [],
            isActive: true,
            storeId: slug,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-product-2',
            name: 'Smart Fitness Watch',
            slug: 'smart-fitness-watch',
            description: 'Track your health and fitness with this advanced smartwatch featuring heart rate monitoring',
            price: 199.99,
            inventory: 25,
            images: [],
            isActive: true,
            storeId: slug,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-product-3',
            name: 'Portable Bluetooth Speaker',
            slug: 'portable-bluetooth-speaker',
            description: 'Compact speaker with powerful sound and long battery life, perfect for outdoor adventures',
            price: 89.99,
            inventory: 100,
            images: [],
            isActive: true,
            storeId: slug,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-product-4',
            name: 'Wireless Charging Pad',
            slug: 'wireless-charging-pad',
            description: 'Fast wireless charging pad compatible with all Qi-enabled devices',
            price: 49.99,
            inventory: 75,
            images: [],
            isActive: true,
            storeId: slug,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        setStore(demoStore);
        setProducts(demoProducts);
      }
    } catch (error) {
      console.error('Error loading storefront:', error);
      // Fallback to demo data when network fails
      const demoStore = {
        id: slug,
        name: slug.replace(/demo-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        slug: slug,
        description: 'Demo store with sample products for testing the storefront',
        domain: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const demoProducts = [
        {
          id: 'demo-product-1',
          name: 'Premium Wireless Headphones',
          slug: 'premium-wireless-headphones',
          description: 'High-quality wireless headphones with noise cancellation and premium sound quality',
          price: 299.99,
          inventory: 50,
          images: [],
          isActive: true,
          storeId: slug,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'demo-product-2',
          name: 'Smart Fitness Watch',
          slug: 'smart-fitness-watch',
          description: 'Track your health and fitness with this advanced smartwatch featuring heart rate monitoring',
          price: 199.99,
          inventory: 25,
          images: [],
          isActive: true,
          storeId: slug,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'demo-product-3',
          name: 'Portable Bluetooth Speaker',
          slug: 'portable-bluetooth-speaker',
          description: 'Compact speaker with powerful sound and long battery life, perfect for outdoor adventures',
          price: 89.99,
          inventory: 100,
          images: [],
          isActive: true,
          storeId: slug,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'demo-product-4',
          name: 'Wireless Charging Pad',
          slug: 'wireless-charging-pad',
          description: 'Fast wireless charging pad compatible with all Qi-enabled devices',
          price: 49.99,
          inventory: 75,
          images: [],
          isActive: true,
          storeId: slug,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      setStore(demoStore);
      setProducts(demoProducts);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.inventory) {
        setCart(cart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
        toast.success('Added to cart');
      } else {
        toast.error('Not enough inventory');
      }
    } else {
      if (product.inventory > 0) {
        setCart([...cart, { ...product, quantity: 1 }]);
        toast.success('Added to cart');
      } else {
        toast.error('Product out of stock');
      }
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (newQuantity > product.inventory) {
      toast.error('Not enough inventory');
      return;
    }

    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const checkout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast.error('Please fill in your name and email');
      return;
    }

    try {
      const orderItems = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      const totalAmount = parseFloat(getCartTotal());

      // First create the order in the database
      const orderResponse = await fetch(`/api/orders/${store.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: orderItems,
          customerInfo,
          total: totalAmount
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        toast.error(error.error || 'Failed to create order');
        return;
      }

      const order = await orderResponse.json();

      // Create Razorpay order
      const paymentResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          receipt: order.orderNumber,
          notes: {
            orderId: order.id,
            customerEmail: customerInfo.email,
            storeId: store.id
          },
          storeId: store.id
        }),
      });

      if (!paymentResponse.ok) {
        toast.error('Failed to initialize payment');
        return;
      }

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        toast.error(paymentData.error || 'Failed to initialize payment');
        return;
      }

      // Load Razorpay script and initialize payment
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => initializeRazorpay(paymentData.order, order);
      script.onerror = () => {
        toast.error('Failed to load payment gateway');
      };
      document.body.appendChild(script);

    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Error during checkout');
    }
  };

  const initializeRazorpay = (razorpayOrder, dbOrder) => {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: store.name,
      description: `Order #${dbOrder.orderNumber}`,
      order_id: razorpayOrder.id,
      prefill: {
        name: customerInfo.name,
        email: customerInfo.email,
        contact: customerInfo.phone
      },
      theme: {
        color: '#3b82f6'
      },
      handler: async function (response) {
        try {
          // Verify payment on server
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: dbOrder.id,
              storeId: store.id
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            // Clear cart and show success
            setCart([]);
            setCustomerInfo({ name: '', email: '', phone: '' });
            setShowCart(false);
            toast.success(`Payment successful! Order #${dbOrder.orderNumber}`, {
              duration: 5000,
            });
          } else {
            toast.error('Payment verification failed');
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          toast.error('Payment verification failed');
        }
      },
      modal: {
        ondismiss: function() {
          toast.info('Payment cancelled');
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Store Not Found</h2>
          <p className="text-muted-foreground">The store you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{store.name}</h1>
              {store.description && (
                <p className="text-muted-foreground">{store.description}</p>
              )}
            </div>
            
            <Dialog open={showCart} onOpenChange={setShowCart}>
              <DialogTrigger asChild>
                <Button className="relative">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Shopping Cart</DialogTitle>
                  <DialogDescription>
                    Review your items and checkout
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground">Your cart is empty</p>
                  ) : (
                    <>
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between space-x-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">${item.price}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-bold">
                          <span>Total: ${getCartTotal()}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Name *</label>
                          <Input
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email *</label>
                          <Input
                            type="email"
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                            placeholder="your@email.com"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Phone</label>
                          <Input
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                            placeholder="Your phone number"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {cart.length > 0 && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCart(false)}>
                      Continue Shopping
                    </Button>
                    <Button onClick={checkout}>
                      Pay ₹{getCartTotal()} with Razorpay
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">
              {searchTerm ? 'No products found' : 'No products available'}
            </h2>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term.' : 'This store hasn\'t added any products yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="h-full flex flex-col">
                {product.images && product.images.length > 0 && (
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    {product.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        +{product.images.length - 1}
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription className="line-clamp-3">
                      {product.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">${product.price}</span>
                      <Badge variant={product.inventory > 0 ? "secondary" : "destructive"}>
                        {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4"
                    disabled={product.inventory === 0}
                    onClick={() => addToCart(product)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}