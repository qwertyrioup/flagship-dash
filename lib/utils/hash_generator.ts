import crypto from 'crypto';

interface HashOptions {
  algorithm?: string;
  encoding?: string;
  [key: string]: unknown;
}

interface HashResult {
  hash: string;
  options: HashOptions;
}

export function generateConsistentHash(metadata: any[], products: any[]): string {
  // Create a string representation of the data
  const dataString = JSON.stringify({
    metadata,
    products: products.map(product => ({
      // Only include essential fields for hashing
      id: product.id,
      name: product.name,
      catalog_number: product.catalog_number,
      supplier_catalog_number: product.supplier_catalog_number,
      supplier_id: product.supplier?.id,
      price: {
        buy: {
          currency: product.price?.buy?.currency,
          amount: product.price?.buy?.amount
        },
        promotion_price: {
          amount: product.price?.promotion_price?.amount
        }
      },
      shipment: {
        dry_ice: product.shipment?.dry_ice
      },
      size: product.size,
      available: product.available,
      display: product.display
    }))
  });

  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

function generateHash(data: string | Buffer, options: HashOptions = {}): HashResult {
  const algorithm = options.algorithm || 'sha256';
  const encoding = (options.encoding || 'hex') as crypto.BinaryToTextEncoding;
  
  const hash = crypto.createHash(algorithm).update(data).digest(encoding);
  
  return {
    hash,
    options: {
      algorithm,
      encoding,
      ...options
    }
  };
} 