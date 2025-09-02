import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import Razorpay from 'razorpay';
import crypto from 'crypto';

let client = null;
let db = null;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    db = client.db(process.env.DB_NAME || 'shopify_clone');
  }
  return db;
}

// Helper function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper function to validate store access
async function validateStoreAccess(storeId, userId = null) {
  const database = await connectToDatabase();
  const store = await database.collection('stores').findOne({ 
    id: storeId,
    isActive: true 
  });
  return !!store;
}

// API Routes Handler
export async function GET(request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  
  console.log(`GET Request - pathname: ${pathname}, segments:`, segments);
  
  try {
    const database = await connectToDatabase();
    
    // Root API endpoint
    if (segments.length <= 1) {
      return NextResponse.json({ message: 'Shopify Clone API Ready' });
    }
    
    const apiPath = segments.slice(1); // Remove 'api' segment
    const [resource, storeId, subResource, itemId] = apiPath;
    
    console.log(`API Path parsing - resource: ${resource}, storeId: ${storeId}, subResource: ${subResource}`);
    
    switch (resource) {
      case 'stores':
        if (!storeId) {
          // GET /api/stores - List all stores
          console.log('Fetching all stores...');
          const stores = await database.collection('stores')
            .find({ isActive: true })
            .sort({ createdAt: -1 })
            .toArray();
          
          console.log(`Found ${stores.length} stores`);
          return NextResponse.json(stores);
        } else {
          // GET /api/stores/:id - Get specific store
          const store = await database.collection('stores').findOne({ 
            id: storeId,
            isActive: true 
          });
          
          if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          return NextResponse.json(store);
        }
        
      case 'products':
        if (storeId) {
          // GET /api/products/:storeId - Get products for a store
          const { searchParams } = new URL(request.url);
          const page = parseInt(searchParams.get('page') || '1');
          const limit = parseInt(searchParams.get('limit') || '10');
          const search = searchParams.get('search') || '';
          
          const skip = (page - 1) * limit;
          
          let query = { storeId, isActive: true };
          if (search) {
            query.$or = [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ];
          }
          
          const [products, total] = await Promise.all([
            database.collection('products')
              .find(query)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limit)
              .toArray(),
            database.collection('products').countDocuments(query)
          ]);
          
          return NextResponse.json({
            products,
            meta: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit)
            }
          });
        }
        break;
        
      case 'orders':
        if (storeId) {
          // GET /api/orders/:storeId - Get orders for a store
          const { searchParams } = new URL(request.url);
          const page = parseInt(searchParams.get('page') || '1');
          const limit = parseInt(searchParams.get('limit') || '10');
          const status = searchParams.get('status');
          
          const skip = (page - 1) * limit;
          
          let query = { storeId };
          if (status) {
            query.status = status;
          }
          
          const [orders, total] = await Promise.all([
            database.collection('orders')
              .find(query)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limit)
              .toArray(),
            database.collection('orders').countDocuments(query)
          ]);
          
          return NextResponse.json({
            orders,
            meta: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit)
            }
          });
        }
        break;
        
      case 'analytics':
        if (storeId) {
          // GET /api/analytics/:storeId - Get analytics data for store
          const { searchParams } = new URL(request.url);
          const period = searchParams.get('period') || '30'; // days
          
          // Validate store exists
          const storeExists = await validateStoreAccess(storeId);
          if (!storeExists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          const daysAgo = parseInt(period);
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysAgo);
          
          const [
            totalOrders,
            totalRevenue,
            completedOrders,
            pendingOrders,
            totalProducts,
            topProducts,
            recentOrders,
            dailySales
          ] = await Promise.all([
            // Total orders
            database.collection('orders').countDocuments({ 
              storeId,
              createdAt: { $gte: startDate }
            }),
            
            // Total revenue (completed orders only)
            database.collection('orders').aggregate([
              { 
                $match: { 
                  storeId,
                  status: { $in: ['paid', 'completed'] },
                  createdAt: { $gte: startDate }
                }
              },
              { $group: { _id: null, total: { $sum: '$total' } } }
            ]).toArray(),
            
            // Completed orders count
            database.collection('orders').countDocuments({ 
              storeId,
              status: { $in: ['paid', 'completed'] },
              createdAt: { $gte: startDate }
            }),
            
            // Pending orders count
            database.collection('orders').countDocuments({ 
              storeId,
              status: 'pending',
              createdAt: { $gte: startDate }
            }),
            
            // Total products
            database.collection('products').countDocuments({ 
              storeId,
              isActive: true
            }),
            
            // Top products by quantity sold
            database.collection('orders').aggregate([
              { 
                $match: { 
                  storeId,
                  status: { $in: ['paid', 'completed'] },
                  createdAt: { $gte: startDate }
                }
              },
              { $unwind: '$items' },
              { 
                $group: { 
                  _id: '$items.productId',
                  name: { $first: '$items.productName' },
                  totalQuantity: { $sum: '$items.quantity' },
                  totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
              },
              { $sort: { totalQuantity: -1 } },
              { $limit: 5 }
            ]).toArray(),
            
            // Recent orders
            database.collection('orders')
              .find({ storeId })
              .sort({ createdAt: -1 })
              .limit(10)
              .toArray(),
            
            // Daily sales for chart
            database.collection('orders').aggregate([
              { 
                $match: { 
                  storeId,
                  status: { $in: ['paid', 'completed'] },
                  createdAt: { $gte: startDate }
                }
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                  },
                  sales: { $sum: '$total' },
                  orders: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]).toArray()
          ]);
          
          const analytics = {
            summary: {
              totalOrders,
              totalRevenue: totalRevenue[0]?.total || 0,
              completedOrders,
              pendingOrders,
              totalProducts,
              conversionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0
            },
            topProducts,
            recentOrders: recentOrders.slice(0, 5),
            chartData: dailySales.map(item => ({
              date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
              sales: item.sales,
              orders: item.orders
            }))
          };
          
          return NextResponse.json(analytics);
        }
        break;
        
      case 'storefront':
        if (storeId) {
          // GET /api/storefront/:storeSlug - Get storefront data
          const store = await database.collection('stores').findOne({ 
            slug: storeId, // Using storeId as slug here
            isActive: true 
          });
          
          if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          const products = await database.collection('products')
            .find({ storeId: store.id, isActive: true })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();
          
          return NextResponse.json({ store, products });
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const apiPath = segments.slice(1); // Remove 'api' segment
  const [resource, storeId, subResource] = apiPath;
  
  console.log(`POST Request - pathname: ${pathname}, segments:`, segments);
  console.log(`POST API Path parsing - resource: ${resource}, storeId: ${storeId}, subResource: ${subResource}`);
  
  try {
    const database = await connectToDatabase();
    
    // Handle upload endpoint differently (form data instead of JSON)
    if (resource === 'upload') {
      console.log('Handling file upload...');
      if (storeId) {
        // POST /api/upload/:storeId - Upload images for store
        
        // Validate store exists
        const storeExists = await validateStoreAccess(storeId);
        if (!storeExists) {
          return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }
        
        try {
          const formData = await request.formData();
          const files = formData.getAll('images');
          
          // Check if no files or all files are empty
          if (!files || files.length === 0 || files.every(file => !file || file.size === 0)) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
          }
          
          const uploadedImages = [];
          
          for (const file of files) {
            if (!file || file.size === 0) continue;
            
            // Generate unique filename
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const fileName = `${storeId}_${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
            
            // Create upload path
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            const filePath = path.join(uploadDir, fileName);
            
            // Ensure upload directory exists
            await mkdir(uploadDir, { recursive: true });
            
            // Convert file to buffer and save
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            await writeFile(filePath, buffer);
            
            // Store image info
            const imageUrl = `/uploads/${fileName}`;
            uploadedImages.push({
              url: imageUrl,
              filename: fileName,
              originalName: file.name,
              size: file.size
            });
          }
          
          return NextResponse.json({ 
            success: true, 
            images: uploadedImages 
          }, { status: 201 });
          
        } catch (error) {
          console.error('File upload error:', error);
          return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
        }
      }
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    // For all other endpoints, parse JSON
    const body = await request.json();
    
    switch (resource) {
      case 'stores':
        // POST /api/stores - Create new store
        const { name, description, domain } = body;
        
        if (!name) {
          return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
        }
        
        const slug = generateSlug(name);
        
        // Check if slug already exists
        const existingStore = await database.collection('stores').findOne({ slug });
        if (existingStore) {
          return NextResponse.json({ error: 'Store name already taken' }, { status: 400 });
        }
        
        const newStore = {
          id: uuidv4(),
          name,
          slug,
          description: description || '',
          domain: domain || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await database.collection('stores').insertOne(newStore);
        
        return NextResponse.json(newStore, { status: 201 });
        
      case 'products':
        if (storeId) {
          // POST /api/products/:storeId - Create product for store
          const { name, description, price, inventory, images } = body;
          
          if (!name || price === undefined) {
            return NextResponse.json({ 
              error: 'Product name and price are required' 
            }, { status: 400 });
          }
          
          // Validate store exists
          const storeExists = await validateStoreAccess(storeId);
          if (!storeExists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          const productSlug = generateSlug(name);
          
          // Check if product slug exists within this store
          const existingProduct = await database.collection('products').findOne({
            storeId,
            slug: productSlug
          });
          
          if (existingProduct) {
            return NextResponse.json({ 
              error: 'Product with this name already exists in store' 
            }, { status: 400 });
          }
          
          const newProduct = {
            id: uuidv4(),
            name,
            slug: productSlug,
            description: description || '',
            price: parseFloat(price),
            inventory: parseInt(inventory) || 0,
            images: images || [],
            isActive: true,
            storeId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await database.collection('products').insertOne(newProduct);
          
          return NextResponse.json(newProduct, { status: 201 });
        }
        break;
        
      case 'orders':
        if (storeId) {
          // POST /api/orders/:storeId - Create order for store
          const { items, customerInfo, total } = body;
          
          if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ 
              error: 'Order items are required' 
            }, { status: 400 });
          }
          
          // Validate store exists
          const storeExists = await validateStoreAccess(storeId);
          if (!storeExists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          // Validate products exist
          const productIds = items.map(item => item.productId);
          const products = await database.collection('products')
            .find({ 
              id: { $in: productIds },
              storeId,
              isActive: true 
            })
            .toArray();
          
          if (products.length !== productIds.length) {
            return NextResponse.json({ 
              error: 'One or more products not found' 
            }, { status: 400 });
          }
          
          // Calculate total if not provided
          let calculatedTotal = 0;
          const orderItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const itemTotal = product.price * item.quantity;
            calculatedTotal += itemTotal;
            
            return {
              productId: item.productId,
              productName: product.name,
              quantity: item.quantity,
              price: product.price,
              total: itemTotal
            };
          });
          
          const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
          
          const newOrder = {
            id: uuidv4(),
            orderNumber,
            storeId,
            items: orderItems,
            total: total || calculatedTotal,
            status: 'pending',
            customerInfo: customerInfo || {},
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await database.collection('orders').insertOne(newOrder);
          
          return NextResponse.json(newOrder, { status: 201 });
        }
        break;

      case 'payment':
        if (storeId === 'create-order') {
          // POST /api/payment/create-order - Create Razorpay order
          const { amount, currency = "INR", receipt, notes, storeId } = body;
          
          if (!amount || !receipt) {
            return NextResponse.json({ 
              error: 'Amount and receipt are required' 
            }, { status: 400 });
          }

          try {
            // Initialize Razorpay
            const razorpay = new Razorpay({
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            // Create order
            const order = await razorpay.orders.create({
              amount: Math.round(amount * 100), // Convert to paise
              currency,
              receipt,
              notes: {
                ...notes,
                storeId
              },
              payment_capture: 1, // Auto-capture payment
            });

            return NextResponse.json({ 
              success: true, 
              order 
            });
          } catch (error) {
            console.error("Error creating Razorpay order:", error);
            return NextResponse.json(
              { success: false, error: error.message },
              { status: 500 }
            );
          }
        } else if (storeId === 'verify') {
          // POST /api/payment/verify - Verify payment
          const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            orderId,
            storeId
          } = body;

          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ 
              error: 'Missing payment verification parameters' 
            }, { status: 400 });
          }

          try {
            // Verify signature
            const generatedSignature = crypto
              .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
              .update(razorpay_order_id + '|' + razorpay_payment_id)
              .digest('hex');

            if (generatedSignature !== razorpay_signature) {
              return NextResponse.json(
                { success: false, error: 'Invalid payment signature' },
                { status: 400 }
              );
            }

            // Update order status in database
            const database = await connectToDatabase();
            const result = await database.collection('orders').updateOne(
              { id: orderId, storeId },
              { 
                $set: { 
                  status: 'paid',
                  paymentStatus: 'completed',
                  razorpayOrderId: razorpay_order_id,
                  razorpayPaymentId: razorpay_payment_id,
                  paymentCompletedAt: new Date(),
                  updatedAt: new Date()
                } 
              }
            );

            if (result.matchedCount === 0) {
              return NextResponse.json({ 
                error: 'Order not found' 
              }, { status: 404 });
            }

            return NextResponse.json({ 
              success: true,
              message: 'Payment verified successfully' 
            });
          } catch (error) {
            console.error("Error verifying payment:", error);
            return NextResponse.json(
              { success: false, error: error.message },
              { status: 500 }
            );
          }
        }
        break;

      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const apiPath = segments.slice(1); // Remove 'api' segment
  const [resource, storeId, subResource, itemId] = apiPath;
  
  try {
    const database = await connectToDatabase();
    const body = await request.json();
    
    switch (resource) {
      case 'products':
        if (storeId && subResource && itemId) {
          // PUT /api/products/:storeId/:itemId - Update product
          const { name, description, price, inventory, images, isActive } = body;
          
          // Validate store exists
          const storeExists = await validateStoreAccess(storeId);
          if (!storeExists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          const updateData = {
            updatedAt: new Date()
          };
          
          if (name) {
            updateData.name = name;
            updateData.slug = generateSlug(name);
          }
          if (description !== undefined) updateData.description = description;
          if (price !== undefined) updateData.price = parseFloat(price);
          if (inventory !== undefined) updateData.inventory = parseInt(inventory);
          if (images !== undefined) updateData.images = images;
          if (isActive !== undefined) updateData.isActive = isActive;
          
          const result = await database.collection('products').updateOne(
            { id: itemId, storeId },
            { $set: updateData }
          );
          
          if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
          }
          
          const updatedProduct = await database.collection('products').findOne({ 
            id: itemId, 
            storeId 
          });
          
          return NextResponse.json(updatedProduct);
        }
        break;
        
      case 'orders':
        if (storeId && subResource && itemId) {
          // PUT /api/orders/:storeId/:itemId - Update order status
          const { status } = body;
          
          if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
          }
          
          // Validate store exists
          const storeExists = await validateStoreAccess(storeId);
          if (!storeExists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          const result = await database.collection('orders').updateOne(
            { id: itemId, storeId },
            { 
              $set: { 
                status,
                updatedAt: new Date()
              }
            }
          );
          
          if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
          }
          
          const updatedOrder = await database.collection('orders').findOne({ 
            id: itemId, 
            storeId 
          });
          
          return NextResponse.json(updatedOrder);
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('PUT API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const apiPath = segments.slice(1); // Remove 'api' segment
  const [resource, storeId, subResource, itemId] = apiPath;
  
  try {
    const database = await connectToDatabase();
    
    switch (resource) {
      case 'products':
        if (storeId && subResource && itemId) {
          // DELETE /api/products/:storeId/:itemId - Delete product
          
          // Validate store exists
          const storeExists = await validateStoreAccess(storeId);
          if (!storeExists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          
          const result = await database.collection('products').deleteOne({
            id: itemId,
            storeId
          });
          
          if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
          }
          
          return NextResponse.json({ success: true });
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}