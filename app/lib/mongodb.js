import { MongoClient } from 'mongodb';

let client;
let clientPromise;

export function getMongoClient() {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    const options = {};

    if (!uri) {
      throw new Error('Missing MONGODB_URI environment variable');
    }

    client = new MongoClient(uri, options);

    if (process.env.NODE_ENV === 'development') {
      // Prevent multiple connections in dev due to hot reload
      if (!global._mongoClientPromise) {
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      clientPromise = client.connect();
    }
  }

  return clientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI environment variable');

  const defaultDbName = uri.split('/').pop()?.split('?')[0];
  return client.db(defaultDbName);
}