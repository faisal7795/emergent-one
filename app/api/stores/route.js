import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

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

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET() {
  try {
    console.log('Stores GET: Fetching all stores...');
    const database = await connectToDatabase();
    
    const stores = await database.collection('stores')
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Stores GET: Found ${stores.length} stores`);
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Stores GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('Stores POST: Creating new store...');
    const database = await connectToDatabase();
    const body = await request.json();
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
    console.log(`Stores POST: Created store with ID ${newStore.id}`);
    
    return NextResponse.json(newStore, { status: 201 });
  } catch (error) {
    console.error('Stores POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}