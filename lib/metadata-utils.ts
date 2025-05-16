import crypto from 'crypto';

export interface SheetMetadata {
  sheetName: string;
  rowCount: number;
  headers: string[];
  fileName?: string;
}

export interface ProductData {
  [key: string]: any;
}

interface MetadataOptions {
  algorithm?: string;
  encoding?: crypto.BinaryToTextEncoding;
  [key: string]: unknown;
}

export function generateMetadataHash(metadata: SheetMetadata[], products: ProductData[]): string {
  try {
    // Create a hash of metadata
    const metadataString = JSON.stringify(metadata);
    const metadataHash = crypto.createHash("sha256").update(metadataString).digest("hex");
    
    // Sample products for hashing
    const sampleSize = 1;
    const sampledProducts: ProductData[] = [];
    
    if (products.length > 0) {
      // Add first samples
      const firstSamples = products.slice(0, Math.min(sampleSize, products.length));
      sampledProducts.push(...firstSamples);
      
      // Add middle samples if there are enough products
      if (products.length > sampleSize * 2) {
        const middleIndex = Math.floor(products.length / 2);
        const middleSamples = products.slice(
          Math.max(0, middleIndex - Math.floor(sampleSize / 2)),
          Math.min(products.length, middleIndex + Math.ceil(sampleSize / 2))
        );
        sampledProducts.push(...middleSamples);
      }
      
      // Add last samples if there are enough products
      if (products.length > sampleSize) {
        const lastSamples = products.slice(Math.max(0, products.length - sampleSize));
        sampledProducts.push(...lastSamples);
      }
    }
    
    // Create a hash of the sampled products
    const productsString = JSON.stringify(sampledProducts);
    const productsHash = crypto.createHash("sha256").update(productsString).digest("hex");
    
    // Combine both hashes with the total product count
    const totalCount = products.length.toString();
    const combinedHash = crypto
      .createHash("sha256")
      .update(metadataHash)
      .update(productsHash)
      .update(totalCount)
      .digest("hex");
    
    return combinedHash;
  } catch (error) {
    console.error(`Warning: Error generating hash: ${error}. Using fallback.`);
    return crypto.createHash("sha256")
      .update(String(metadata.length) + String(products.length))
      .digest("hex");
  }
}

// Helper function for generating hashes from raw data
export function generateHashFromData(data: string | Buffer, options: MetadataOptions = {}): string {
  const algorithm = options.algorithm || 'sha256';
  const encoding = options.encoding || 'hex';
  return crypto.createHash(algorithm).update(data).digest(encoding);
} 