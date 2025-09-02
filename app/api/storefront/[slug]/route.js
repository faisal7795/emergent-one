import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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

export async function GET(request, { params }) {
  const { slug } = params;
  
  try {
    console.log(`Storefront GET: Looking for store with slug: ${slug}`);
    const database = await connectToDatabase();
    
    // Find store by slug
    const store = await database.collection('stores').findOne({ 
      slug: slug,
      isActive: true 
    });
    
    if (!store) {
      console.log(`Storefront GET: Store not found for slug: ${slug}`);
      // Check if this is a demo store
      if (slug.startsWith('demo-')) {
        // Return demo store data
        const demoStore = {
          id: slug,
          name: slug.replace('demo-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          slug: slug,
          description: 'Demo store with sample products',
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
            description: 'High-quality wireless headphones with noise cancellation',
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
            description: 'Track your health and fitness with this advanced smartwatch',
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
            description: 'Compact speaker with powerful sound and long battery life',
            price: 89.99,
            inventory: 100,
            images: [],
            isActive: true,
            storeId: slug,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        console.log(`Storefront GET: Returning demo data for ${slug}`);
        return NextResponse.json({ store: demoStore, products: demoProducts });
      }
      
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    
    // Get products for this store
    const products = await database.collection('products')
      .find({ storeId: store.id, isActive: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    console.log(`Storefront GET: Found store ${store.name} with ${products.length} products`);
    return NextResponse.json({ store, products });
    
  } catch (error) {
    console.error('Storefront API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}