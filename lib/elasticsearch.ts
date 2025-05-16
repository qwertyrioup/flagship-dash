import { Client } from '@elastic/elasticsearch';
import { ELASTIC_URL, ELASTIC_USERNAME, ELASTIC_PASSWORD } from './consts';

// Using client v9.0.1 against Elasticsearch 8.12.0 server

/**
 * Interface for cached Elasticsearch client
 */
interface ElasticCached {
  client: Client | null;
  promise: Promise<Client> | null;
}

// Check if required environment variables are set
if (!ELASTIC_URL) {
  throw new Error('ELASTIC_URL is not defined in environment variables');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially.
 */
declare global {
  // eslint-disable-next-line no-var
  var elasticConnection: ElasticCached | undefined;
}

// Use existing connection if available
const cached: ElasticCached = global.elasticConnection || { client: null, promise: null };

// Store the cached connection
if (!global.elasticConnection) {
  global.elasticConnection = cached;
}

/**
 * Connect to Elasticsearch
 * Reuses connection if already established
 */
export async function connectToElasticsearch(): Promise<Client> {
  // If we have a cached client, return it
  if (cached.client) {
    return cached.client;
  }

  // If we're already connecting, wait for that promise
  if (!cached.promise) {
    try {
      // console.log('Connecting to Elasticsearch at:', ELASTIC_URL);
      
      // Configure client options for client v9.0.1 connecting to Elasticsearch 8.12.0
      const clientOptions = {
        node: ELASTIC_URL,
        tls: {
          rejectUnauthorized: false, // For development with self-signed certificates
          minVersion: 'TLSv1' as const
        },
        compression: false,
        maxRetries: 5,
        requestTimeout: 60000,
        sniffOnStart: false,
        sniffOnConnectionFault: false,
        suggestCompression: false,
        ssl: {
          rejectUnauthorized: false
        },
        // Tell the client to act like a v8 client
        compatibility: '8',
        auth: undefined as { username: string; password: string } | undefined
      };

      // Add authentication if credentials are provided
      if (ELASTIC_USERNAME && ELASTIC_PASSWORD) {
        clientOptions.auth = {
          username: ELASTIC_USERNAME,
          password: ELASTIC_PASSWORD
        };
        // console.log('Using authenticated Elasticsearch connection');
      }

      // Create a new client
      const client = new Client(clientOptions);
      
      // Don't set default headers here - we'll handle them per request
      
      cached.client = client;
      cached.promise = Promise.resolve(client);
      // console.log('Elasticsearch client created successfully');
      return client;
    } catch (initError) {
      console.error('Failed to initialize Elasticsearch client:', initError);
      cached.promise = null;
      if (initError instanceof Error) {
        throw initError;
      } else {
        throw new Error('Unknown initialization error');
      }
    }
  }

  try {
    // Wait for the connection to be established
    cached.client = await cached.promise;
    return cached.client;
  } catch (error) {
    console.error('Error establishing Elasticsearch connection:', error);
    // Reset the promise on error to allow retrying
    cached.promise = null;
    throw error;
  }
}

/**
 * Custom wrapper for search to ensure proper headers for compatibility
 */
export async function searchDocuments(index: string, query: unknown) {
  try {
    const client = await connectToElasticsearch();
    
    const result = await client.transport.request({
      method: 'POST',
      path: `/${index}/_search`,
      body: query as Record<string, unknown>
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error searching documents in index ${index}:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown search error');
    }
  }
}

/**
 * Get a document by ID from an Elasticsearch index
 * @param index - The index to search
 * @param id - The document ID
 * @returns The document if found
 */
export async function getDocument(index: string, id: string) {
  try {
    // console.log(`Getting document from index: ${index}, id: ${id}`);
    const client = await connectToElasticsearch();
    
    try {
      // Move headers to second parameter (options)
      const result = await client.transport.request({
        method: 'GET',
        path: `/${index}/_doc/${id}`
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      return result;
    } catch (requestError: unknown) {
      // Handle 404 not found separately
      if (requestError && typeof requestError === 'object' && 'statusCode' in requestError && requestError.statusCode === 404) {
        // console.log(`Document not found - index: ${index}, id: ${id}`);
        return null;
      }
      
      console.error(`Error requesting document - index: ${index}, id: ${id}`, requestError);
      throw requestError;
    }
  } catch (error) {
    console.error(`Failed to get document - index: ${index}, id: ${id}`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown document fetch error: ${error}`);
    }
  }
}

/**
 * Index a document in Elasticsearch
 * @param index - The index to add the document to
 * @param document - The document to index
 * @param id - Optional document ID
 * @returns The indexing result
 */
export async function indexDocument(index: string, document: unknown, id?: string) {
  try {
    const client = await connectToElasticsearch();
    
    const path = id ? `/${index}/_doc/${id}` : `/${index}/_doc`;
    const result = await client.transport.request({
      method: 'POST',
      path,
      body: document as Record<string, unknown>
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error indexing document in ${index}:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown indexing error');
    }
  }
}

/**
 * Update a document in Elasticsearch
 * @param index - The index containing the document
 * @param id - The document ID
 * @param doc - The partial document with fields to update
 * @returns The update result
 */
export async function updateDocument(index: string, id: string, doc: unknown) {
  try {
    const client = await connectToElasticsearch();
    
    // Move headers to second parameter (options)
    const result = await client.transport.request({
      method: 'POST',
      path: `/${index}/_update/${id}`,
      body: { doc }
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error updating document ${id} in ${index}:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown update error');
    }
  }
}

/**
 * Delete a document from Elasticsearch
 * @param index - The index containing the document
 * @param id - The document ID
 * @returns The deletion result
 */
export async function deleteDocument(index: string, id: string) {
  try {
    const client = await connectToElasticsearch();
    
    // Move headers to second parameter (options)
    const result = await client.transport.request({
      method: 'DELETE',
      path: `/${index}/_doc/${id}`
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error deleting document ${id} from ${index}:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown deletion error');
    }
  }
}

/**
 * Check if Elasticsearch is connected
 * @returns Boolean indicating connection status
 */
export async function isElasticsearchConnected(): Promise<boolean> {
  try {
    const client = await connectToElasticsearch();
    
    // Move headers to second parameter (options)
    await client.transport.request({
      method: 'GET',
      path: '/'
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error checking Elasticsearch connection:', error);
    return false;
  }
}