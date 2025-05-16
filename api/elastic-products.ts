'use server';

import { ApiResponse, errorResponse, successResponse } from '@/lib/api-response';
import { getDocument } from '@/lib/elasticsearch';

// Index name for products
const PRODUCTS_INDEX = 'gentaur_products';

/**
 * Get a product by ID from Elasticsearch
 * @param id - Product ID
 * @returns ApiResponse with the product if found
 */
export async function getProductById(id: string): Promise<ApiResponse> {
  try {
    // console.log(`Fetching product with ID: ${id} from Elasticsearch`);
    
    try {
      const result = await getDocument(PRODUCTS_INDEX, id) as { _source?: any };
      
      if (!result) {
        // console.log(`No result returned for product ID: ${id}`);
        return errorResponse('Product not found');
      }
      
      if (!result._source) {
        // console.log(`No _source in result for product ID: ${id}`, result);
        return errorResponse('Product not found');
      }
      
      // console.log(`Successfully retrieved product ID: ${id}`);
      return successResponse('Product found successfully', result._source);
    } catch (docError) {
      console.error(`Error in getDocument for product ID: ${id}`, docError);
      
      // Return a fallback "not found" response instead of throwing
      return errorResponse('Product not found due to Elasticsearch error');
    }
  } catch (error) {
    console.error(`Error fetching product ID: ${id} from Elasticsearch:`, error);
    return errorResponse('Failed to fetch product', error);
  }
}
