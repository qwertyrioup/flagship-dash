"use server";

import { searchDocuments } from "@/lib/elasticsearch";
import {
  successResponse,
  errorResponse,
  ApiResponse,
} from "@/lib/api-response";
import mongoose from "mongoose";
import HotProduct from "@/models/Hot_Product";
import Review from "@/models/Review";
import { connectToDatabase } from "@/lib/mongoose";

// Index name for products
const PRODUCTS_INDEX = "gentaur_products";

// Cache for search results to improve performance (10 minute TTL)
const SEARCH_CACHE: {
  [key: string]: {
    timestamp: number;
    result: any;
  };
} = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Common exclusion filters for all searches
const COMMON_EXCLUSION_FILTERS = [
  {
    bool: {
      must: [{ match: { name: "strep" } }, { match: { name: "tag" } }],
    },
  },
  {
    bool: {
      must: [{ match: { name: "strep" } }, { match: { name: "tactin" } }],
    },
  },
];

// Common source fields to return
const SOURCE_FIELDS = [
  "id",
  "catalog_number",
  "name",
  "size",
  "sell_price",
  "supplier_id",
  "price_valid_until_date",
  "filters",
  "extensions",
  "promotion_price",
  "extensions",
  "supplier_name",
  "supplier_catalog_number",
];

interface ElasticsearchHit {
  _source: {
    id: number;
    name: string;
    catalog_number: string;
    size: string;
    supplier_id?: string | number;
    cluster_name?: string;
  };
}

interface ElasticsearchResponse {
  hits: {
    hits: ElasticsearchHit[];
  };
}

/**
 * Generate a cache key for search parameters
 */
function generateCacheKey(params: any): string {
  return JSON.stringify(params);
}

/**
 * Check if a cached result is still valid
 */
function isValidCache(key: string): boolean {
  const cachedItem = SEARCH_CACHE[key];
  if (!cachedItem) return false;

  const now = Date.now();
  return now - cachedItem.timestamp < CACHE_TTL;
}

/**
 * Process search results to extract products and filter aggregations
 */
function processSearchResults(result: any): {
  products: any[];
  filters: any[];
  total: number;
  pages: number;
  took: number;
} {
  // Safely extract hits
  const hits =
    result && typeof result === "object" && "hits" in result
      ? result.hits
      : { hits: [], total: 0 };

  // Extract product data with null safety
  const productSources = Array.isArray(hits.hits)
    ? hits.hits.map((item: any) => item._source)
    : [];

  // Process products with optimized map function
  const products = productSources.map((src: any) => ({
    id: src.id,
    catalog_number: src.catalog_number,
    name: src.name,
    size: src.size,
    sell_price: src.sell_price,
    price_valid_until_date: src.price_valid_until_date,
    discontinued: !!(src.extensions?.[0]?.v_discontinued?.value === true),
    supplier_discount: false,
    promotion_price: src.promotion_price,
    supplier_id: src.supplier_id,
    extensions: src.extensions,
    supplier_name: src.supplier_name,
    supplier_catalog_number: src.supplier_catalog_number,
  }));

  // Handle Elasticsearch 8.x response format for total hits
  const totalHits =
    typeof hits.total === "number"
      ? hits.total
      : typeof hits.total === "object" && hits.total && "value" in hits.total
      ? hits.total.value
      : 0;

  const limit = 100;
  const count = Math.min(totalHits, 10_000);
  const pages = Math.min(Math.ceil(Number(totalHits) / limit), 100);

  // Process filter aggregations
  let filters: any[] = [];
  const aggregations =
    result && typeof result === "object" && "aggregations" in result
      ? result.aggregations
      : null;
  const buckets =
    aggregations && "filters_count" in aggregations
      ? aggregations.filters_count.buckets
      : [];

  if (buckets && Array.isArray(buckets) && buckets.length > 0) {
    // Use Map for better performance with large datasets
    const filterGroups = new Map<string, any[]>();

    // Process all buckets in a single loop for better performance
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      const filterValue = bucket.key;
      const separatorIndex = filterValue.indexOf(":");

      const filterName = filterValue.substring(0, separatorIndex);
      const value = filterValue.substring(separatorIndex + 1);

      let filterGroup = filterGroups.get(filterName);
      if (!filterGroup) {
        filterGroup = [];
        filterGroups.set(filterName, filterGroup);
      }

      filterGroup.push({
        key: value,
        doc_count: bucket.doc_count,
      });
    }

    // Convert map to array with pre-allocated array for better performance
    filters = Array(filterGroups.size);
    let index = 0;

    filterGroups.forEach((values, key) => {
      // Calculate total doc count with a single loop
      let totalCount = 0;
      for (let i = 0; i < values.length; i++) {
        totalCount += values[i].doc_count;
      }

      filters[index++] = {
        key,
        doc_count: totalCount,
        filter_values: values,
      };
    });
  }

  return {
    products,
    filters,
    total: totalHits,
    pages,
    took:
      result && typeof result === "object" && "took" in result
        ? result.took
        : 0,
  };
}

/**
 * Optimized search query builder
 */
function buildSearchQuery(
  pageNumber: number = 1,
  mustConditions: any[] = [],
  filterConditions: any[] = [],
  mustNotConditions: any[] = COMMON_EXCLUSION_FILTERS,
  sort: any[] = [{ _score: { order: "desc" } }]
) {
  const limit = 100;

  return {
    query: {
      bool: {
        must: mustConditions,
        filter: filterConditions,
        must_not: mustNotConditions,
      },
    },
    size: limit,
    from: (pageNumber - 1) * limit,
    track_total_hits: true,
    _source: SOURCE_FIELDS,
    sort,
    aggs: {
      filters_count: {
        terms: {
          field: "filters",
          order: { _key: "asc" },
          size: 1000,
          shard_size: 300,
        },
      },
    },
  };
}

/**
 * Search products with custom field filters
 * @param page - Page number for pagination
 * @param searchText - General search query
 * @param fieldsBody - Array of field:value pairs for specific field searching
 * @param filters - Array of filter values to apply
 * @returns ApiResponse with search results
 */
export async function searchWithFields(
  page: number = 1,
  searchText: string = "",
  fieldsBody: string[] = [],
  filters: string[] = []
): Promise<ApiResponse> {
  try {
    // Generate cache key for these search parameters
    const cacheKey = generateCacheKey({
      type: "fields",
      page,
      searchText,
      fieldsBody,
      filters,
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Products found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    const pageNumber = Math.max(1, page);
    const mustConditions: any[] = [];
    const filterConditions: any[] = [];

    // Add text search if provided
    if (searchText) {
      mustConditions.push({
        multi_match: {
          query: searchText,
          fields: ["name^3", "supplier_catalog_number^3", "catalog_number^3"],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      });
    }

    // Process field-specific search conditions
    if (fieldsBody.length > 0) {
      fieldsBody.forEach((field: string) => {
        const [fieldName, fieldValue] = field.split(":");

        // Name edge ngram search
        if (fieldName === "name_edge_ngram") {
          mustConditions.push({
            match: {
              ["name"]: {
                query: fieldValue.trim(),
                operator: "and",
                fuzziness: "AUTO",
                boost: 5,
              },
            },
          });
        }
        // Catalog number edge ngram search
        else if (fieldName === "catalog_number_edge_ngram") {
          const terms = fieldValue.trim().split(/\s+/);
          const shouldClauses = terms.map((term) => ({
            wildcard: {
              [fieldName]: {
                value: `*${term}*`,
                case_insensitive: true,
                boost: 5,
              },
            },
          }));

          mustConditions.push({
            bool: {
              should: shouldClauses,
              minimum_should_match: 1,
            },
          });
        }
        // Supplier catalog number edge ngram search
        else if (fieldName === "supplier_catalog_number_edge_ngram") {
          const terms = fieldValue.trim().split(/\s+/);
          const shouldClauses = terms.map((term) => ({
            wildcard: {
              [fieldName]: {
                value: `*${term}*`,
                case_insensitive: true,
                boost: 5,
              },
            },
          }));

          mustConditions.push({
            bool: {
              should: shouldClauses,
              minimum_should_match: 1,
            },
          });
        }
        // Supplier name edge ngram search
        else if (fieldName === "supplier_name_edge_ngram") {
          const terms = fieldValue.trim().split(/\s+/);
          const shouldClauses = terms.map((term) => ({
            wildcard: {
              [fieldName]: {
                value: `*${term}*`,
                case_insensitive: true,
                boost: 5,
              },
            },
          }));

          mustConditions.push({
            bool: {
              should: shouldClauses,
              minimum_should_match: 1,
            },
          });
        }
        // Extension fields (v_ or c_ prefixed fields)
        else if (
          (fieldName.startsWith("v_") || fieldName.startsWith("c_")) &&
          fieldName !== "species"
        ) {
          mustConditions.push({
            nested: {
              path: "extensions",
              query: {
                bool: {
                  should: [
                    {
                      wildcard: {
                        [`extensions.${fieldName}.value`]: {
                          value: `*${fieldValue}*`,
                          case_insensitive: true,
                        },
                      },
                    },
                    {
                      terms_set: {
                        [`extensions.${fieldName}.value`]: {
                          terms: [fieldValue],
                          minimum_should_match_script: {
                            source: "return 1;",
                          },
                        },
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          });
        }
        // Special case for species search
        else if (fieldName === "species") {
          mustConditions.push({
            nested: {
              path: "extensions",
              query: {
                bool: {
                  should: [
                    {
                      wildcard: {
                        "extensions.c_species_reactivity.value": {
                          value: `*${fieldValue}*`,
                          case_insensitive: true,
                        },
                      },
                    },
                    {
                      terms_set: {
                        "extensions.c_species_reactivity.value": {
                          terms: [fieldValue],
                          minimum_should_match_script: {
                            source: "return 1;",
                          },
                        },
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          });
        }
      });
    }

    // Add filters if provided
    if (filters.length > 0) {
      filters.forEach((filterValue: string) => {
        const trimmedFilter = filterValue.trim();
        if (trimmedFilter) {
          filterConditions.push({
            term: {
              filters: trimmedFilter,
            },
          });
        }
      });
    }

    // Build optimized query
    const elasticQuery = buildSearchQuery(
      pageNumber,
      mustConditions,
      filterConditions
    );

    // Execute the search
    const result = await searchDocuments(PRODUCTS_INDEX, elasticQuery);

    // Process results with optimized processor
    const processedResults = processSearchResults(result);

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: {
        products: processedResults.products,
        filters: processedResults.filters,
        pages: processedResults.pages,
        page: pageNumber,
        count: processedResults.total,
      },
    };

    return successResponse("Products found successfully", {
      products: processedResults.products,
      filters: processedResults.filters,
      pages: processedResults.pages,
      page: pageNumber,
      count: processedResults.total,
    });
  } catch (error) {
    return errorResponse("Failed to search products", error);
  }
}

/**
 * Search products with filter-based approach
 * @param page - Page number for pagination
 * @param searchText - General search query
 * @param filters - Array of filter values to apply
 * @returns ApiResponse with search results
 */
export async function searchWithFilters(
  page: number = 1,
  searchText: string = "",
  filters: string[] = []
): Promise<ApiResponse> {
  try {
    // Generate cache key for these search parameters
    const cacheKey = generateCacheKey({
      type: "filters",
      page,
      searchText,
      filters,
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Products found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    const pageNumber = Math.max(1, page);
    const mustConditions: any[] = [];
    const filterConditions: any[] = [];

    // Add text search if provided with advanced matching
    if (searchText) {
      mustConditions.push({
        bool: {
          should: [
            // Match phrase for exact matches
            {
              match_phrase: {
                name: {
                  query: searchText,
                  boost: 5,
                },
              },
            },
            // Match for partial word matches with fuzziness
            {
              match: {
                name: {
                  query: searchText,
                  fuzziness: "AUTO",
                  operator: "OR",
                  boost: 3,
                },
              },
            },
            // Exact match for catalog numbers (high priority)
            {
              match_phrase: {
                supplier_catalog_number: {
                  query: searchText,
                  boost: 5,
                },
              },
            },
            {
              match_phrase: {
                catalog_number: {
                  query: searchText,
                  boost: 5,
                },
              },
            },
            // Wildcard search for partial matches
            {
              wildcard: {
                name: {
                  value: `*${searchText}*`,
                  boost: 2,
                },
              },
            },
            // Wildcard search for catalog numbers (handles partial matches)
            {
              wildcard: {
                supplier_catalog_number: {
                  value: `*${searchText}*`,
                  boost: 4,
                },
              },
            },
            {
              wildcard: {
                catalog_number: {
                  value: `*${searchText}*`,
                  boost: 4,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Add filters if provided
    if (filters.length > 0) {
      filters.forEach((filterValue: string) => {
        const trimmedFilter = filterValue.trim();
        if (trimmedFilter) {
          filterConditions.push({
            term: {
              filters: trimmedFilter,
            },
          });
        }
      });
    }

    // Build optimized query
    const elasticQuery = buildSearchQuery(
      pageNumber,
      mustConditions,
      filterConditions
    );

    // Execute the search
    const result = await searchDocuments(PRODUCTS_INDEX, elasticQuery);

    // Process results with optimized processor
    const processedResults = processSearchResults(result);

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: {
        products: processedResults.products,
        filters: processedResults.filters,
        pages: processedResults.pages,
        page: pageNumber,
        count: processedResults.total,
      },
    };

    return successResponse("Products found successfully", {
      products: processedResults.products,
      filters: processedResults.filters,
      pages: processedResults.pages,
      page: pageNumber,
      count: processedResults.total,
    });
  } catch (error) {
    return errorResponse("Failed to search products", error);
  }
}

/**
 * Get all products with pagination
 * @param page - Page number for pagination
 * @returns ApiResponse with product results
 */
export async function getAllProducts(page: number = 1): Promise<ApiResponse> {
  try {
    // Generate cache key for these search parameters
    const cacheKey = generateCacheKey({
      type: "all",
      page,
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Products found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    const pageNumber = Math.max(1, page);

    // Build optimized query for all products
    const elasticQuery = buildSearchQuery(
      pageNumber,
      [],
      [],
      COMMON_EXCLUSION_FILTERS,
      [{ id: { order: "asc" } }]
    );

    // Execute the search
    const result = await searchDocuments(PRODUCTS_INDEX, elasticQuery);

    // Process results with optimized processor
    const processedResults = processSearchResults(result);

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: {
        products: processedResults.products,
        filters: processedResults.filters,
        pages: processedResults.pages,
        page: pageNumber,
        count: processedResults.total,
      },
    };

    return successResponse("Products found successfully", {
      products: processedResults.products,
      filters: processedResults.filters,
      pages: processedResults.pages,
      page: pageNumber,
      count: processedResults.total,
    });
  } catch (error) {
    return errorResponse("Failed to fetch products", error);
  }
}

/**
 * Search products with custom category logic
 * @param slug - The category slug
 * @param sub_slug - The subcategory slug
 * @param page - Page number for pagination
 * @returns ApiResponse with product results
 */
export async function searchWithCustomCategoryLogic(
  slug: string,
  sub_slug: string,
  page: string = "1"
): Promise<ApiResponse> {
  try {
    // Generate cache key for these search parameters
    const cacheKey = generateCacheKey({
      type: "custom_category",
      slug,
      sub_slug,
      page,
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Products found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    // Parse page number
    const parsedPage = parseInt(page, 10);
    const pageNumber = isNaN(parsedPage)
      ? 1
      : Math.min(Math.max(parsedPage, 1), 100);

    // Connect to MongoDB
    await connectToDatabase();

    // Use mongoose model directly to find the category by slug
    const GentaurCategory =
      mongoose.models.Gentaur_Category ||
      mongoose.model(
        "Gentaur_Category",
        new mongoose.Schema(
          {
            category: String,
            counts: [
              {
                category_value: String,
                slug: String,
                logic: Object,
              },
            ],
            slug: String,
            logic: Object,
          },
          { timestamps: true }
        )
      );

    // Find the category by slug
    const foundCategory = await GentaurCategory.findOne({ slug: slug });

    if (!foundCategory) {
      return errorResponse("Category not found");
    }

    // Find the subcategory
    const subCategory = foundCategory.counts.find(
      (item: any) => item.slug === sub_slug
    );

    if (!subCategory) {
      return errorResponse("Subcategory not found");
    }

    // Extract logic from the subcategory
    const logic = subCategory?.logic;
    if (!logic) {
      return errorResponse("No search logic found for this subcategory");
    }

    const { operator, queryData, additionalData } = logic;

    // Build Elasticsearch query
    // Note: I'm assuming esQueryCategorySubCategory is imported or defined elsewhere
    // If not, we'll need to implement this function
    const esQuery = buildCustomCategoryQuery(
      operator,
      queryData,
      additionalData,
      pageNumber
    );

    // Execute the search
    const searchResponse: any = await searchDocuments(PRODUCTS_INDEX, esQuery);

    // Extract total hits - handle ES 7.x and 8.x response formats
    const totalHits =
      typeof searchResponse.hits.total === "number"
        ? searchResponse.hits.total
        : searchResponse.hits.total?.value || 0;

    // Calculate pages
    const pages = Math.min(Math.ceil(Number(totalHits) / 100), 100);

    // Extract products
    const products = searchResponse.hits.hits.map((item: any) => item._source);

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: {
        products,
        pages,
        page: pageNumber,
      },
    };

    return successResponse("Products found successfully", {
      products,
      pages,
      page: pageNumber,
    });
  } catch (error) {
    return errorResponse(
      "Failed to search products with custom category logic",
      error
    );
  }
}

/**
 * Build a custom category search query based on operator and query data
 * This is a simplified version - implement the full logic based on your requirements
 */
function buildCustomCategoryQuery(
  operator: string,
  queryData: any[],
  additionalData: any,
  pageNumber: number
) {
  // This is a placeholder implementation
  // Replace this with your actual query building logic from esQueryCategorySubCategory function
  const must: any[] = [];

  if (operator === "AND") {
    // Build AND conditions
    queryData.forEach((query) => {
      if (query.field && query.value) {
        must.push({
          match: {
            [query.field]: query.value,
          },
        });
      }
    });
  } else if (operator === "OR") {
    // Build OR conditions
    const should: any[] = [];
    queryData.forEach((query) => {
      if (query.field && query.value) {
        should.push({
          match: {
            [query.field]: query.value,
          },
        });
      }
    });

    if (should.length > 0) {
      must.push({
        bool: {
          should,
          minimum_should_match: 1,
        },
      });
    }
  }

  const limit = 100;

  return {
    query: {
      bool: {
        must,
        must_not: COMMON_EXCLUSION_FILTERS,
      },
    },
    size: limit,
    from: (pageNumber - 1) * limit,
    track_total_hits: true,
    _source: ["id", "catalog_number", "name", "size"],
    sort: [{ _score: { order: "desc" } }],
  };
}

/**
 * Get products for a custom category and subcategory
 * @param slug - The category slug
 * @param sub_slug - The subcategory slug
 * @param page - Page number for pagination
 * @returns ApiResponse with product results
 */
export async function getProductsForCustomCategoryAndSubCategory(
  slug: string,
  sub_slug: string,
  page: string = "1"
): Promise<ApiResponse> {
  try {
    // Call the server action directly
    const response = await searchWithCustomCategoryLogic(slug, sub_slug, page);

    if (!response.success) {
      throw new Error(response.message || "Failed to search products");
    }

    return response;
  } catch (error) {
    console.error(
      "Error in getProductsForCustomCategoryAndSubCategory:",
      error
    );
    return errorResponse("Failed to search products", error);
  }
}

/**
 * Get popular products based on HotProduct collection
 * @returns ApiResponse with popular product results
 */
export async function getPopulars(): Promise<ApiResponse> {
  try {
    // Generate cache key for popular products
    const cacheKey = generateCacheKey({ type: "populars" });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Popular products found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Get hot product IDs from MongoDB
    const hotProductsIds = await HotProduct.find().select("productId");
    const uniqueIds = [
      ...new Set(hotProductsIds.map((product) => String(product.productId))),
    ];

    if (uniqueIds.length === 0) {
      return successResponse("No popular products found", { products: [] });
    }

    // Build Elasticsearch query for popular products
    const elasticQuery = {
      query: {
        terms: {
          mongo_id: uniqueIds,
        },
      },
      size: uniqueIds.length,
      _source: ["id", "name", "catalog_number", "size"],
      sort: [{ _score: { order: "desc" } }],
    };

    // Execute the search with proper type handling
    const rawResult = await searchDocuments(PRODUCTS_INDEX, elasticQuery);

    // Safe access to nested properties
    const hits =
      typeof rawResult === "object" && rawResult !== null && "hits" in rawResult
        ? (rawResult as any).hits
        : { hits: [] };

    // Process the results
    const products = Array.isArray(hits.hits)
      ? hits.hits.map((hit: any) => {
          const source = hit._source;
          const summary = `CAT:${source.catalog_number}, SIZE:${source.size}`;
          const url = `/products/${source.id}-${source.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")}`;

          return {
            id: source.id,
            title: source.name,
            summary,
            url,
          };
        })
      : [];

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: { products },
    };

    return successResponse("Popular products found successfully", { products });
  } catch (error) {
    console.error("Error in getPopulars:", error);
    return errorResponse("Failed to fetch popular products", error);
  }
}

/**
 * Fetch reviews for a specific product
 * @param productId - The product ID to fetch reviews for
 * @returns ApiResponse with review results
 */
export async function getReviews(
  productId: number | string
): Promise<ApiResponse> {
  try {
    // Generate cache key for these reviews
    const cacheKey = generateCacheKey({
      type: "reviews",
      productId,
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Reviews found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Find reviews sorted by creation date descending
    const reviewDocs = await Review.find({ product_id: Number(productId) })
      .sort({ createdAt: -1 })
      .lean();

    // Serialize MongoDB documents to plain objects
    const reviews = reviewDocs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      role: doc.role,
      rating: doc.rating,
      comment: doc.comment,
      product_id: doc.product_id,
      avatar: doc.avatar,
      initials: doc.initials,
      date: doc.date,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
    }));

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: { reviews },
    };

    return successResponse("Reviews found successfully", { reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return errorResponse("Failed to fetch product reviews", error);
  }
}

/**
 * Fetch similar products based on supplier ID
 * @param supplierId - The supplier ID to find similar products for
 * @returns ApiResponse with similar products
 */
export async function getSimilarProducts(supplierId: string | number, productName: string = ""): Promise<ApiResponse> {
  try {
    // Generate cache key for these similar products
    const cacheKey = generateCacheKey({ 
      type: 'similars', 
      supplierId,
      productName
    });
    
    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse('Similar products found successfully', SEARCH_CACHE[cacheKey].result);
    }


     // Extract meaningful keywords from product name
     const nameKeywords = productName
     .split(/\s+/)
     .filter(word => word.length > 3)  // Filter out short words
     .slice(0, 3);    // Take only first 3 significant keywords

    // Build ES query to find products with the same supplier ID and matching name keywords
    const requestBody = {
      query: {
        bool: {
          must: [
            { term: { supplier_id: supplierId } }
          ],
          should: nameKeywords.length > 0 ? nameKeywords.map(keyword => ({
            match: {
              name: {
                query: keyword,
                boost: 2 // Boost score for matching name keywords
              }
            }
          })) : [],
          minimum_should_match: nameKeywords.length > 0 ? 1 : 0
        }
      },
      size: 10,
      _source: ['id', 'name', 'catalog_number', 'size', 'cluster_name', 'supplier_id']
    };

    // Execute the search with proper type handling
    const rawResult = await searchDocuments(PRODUCTS_INDEX, requestBody);
    
    // Safe access to nested properties
    const hits = typeof rawResult === 'object' && rawResult !== null && 'hits' in rawResult 
      ? (rawResult as any).hits 
      : { hits: [] };
    
    const products = Array.isArray(hits.hits) 
      ? hits.hits.map((item: any) => item._source) 
      : [];
    
    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: { products }
    };
    
    return successResponse('Similar products found successfully', { products });
  } catch (error) {
    console.error('Error fetching similar products:', error);
    return errorResponse('Failed to fetch similar products', error);
  }
}

/**
 * Fetch similar products based on supplier ID and product name
 * @param supplierId - The supplier ID to exclude
 * @param productName - The product name to find similar matches for
 * @returns ApiResponse with similar products
 */
export async function getSimilarProductsNotInSameSupplier(
  supplierId: string | number,
  productName: string = ""
): Promise<ApiResponse> {
  try {
    // Generate cache key for these similar products
    const cacheKey = generateCacheKey({
      type: "similars_not_same_supplier",
      supplierId,
      productName,
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Similar products found successfully",
        SEARCH_CACHE[cacheKey].result
      );
    }

    // Extract meaningful keywords from product name
    const nameKeywords = productName
      .split(/\s+/)
      .filter(word => word.length > 3)  // Filter out short words
      .slice(0, 3);    // Take only first 3 significant keywords

    // Build ES query to find products with similar name but not same supplier
    const requestBody = {
      query: {
        bool: {
          must_not: [
            {
              term: {
                supplier_id: supplierId,
              },
            },
          ],
          should: nameKeywords.length > 0 ? nameKeywords.map(keyword => ({
            match: {
              name: {
                query: keyword,
                boost: 2
              }
            }
          })) : [],
          minimum_should_match: nameKeywords.length > 0 ? 1 : 0
        }
      },
      size: 10,
      _source: [
        "id",
        "name",
        "catalog_number",
        "size",
        "cluster_name",
        "supplier_id",
      ],
    };

    // Execute the search with proper type handling
    const rawResult = await searchDocuments(PRODUCTS_INDEX, requestBody);

    // Safe access to nested properties
    const hits =
      typeof rawResult === "object" && rawResult !== null && "hits" in rawResult
        ? (rawResult as any).hits
        : { hits: [] };

    const products = Array.isArray(hits.hits)
      ? hits.hits.map((item: any) => item._source)
      : [];

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: { products },
    };

    return successResponse("Similar products found successfully", { products });
  } catch (error) {
    console.error("Error fetching similar products:", error);
    return errorResponse("Failed to fetch similar products", error);
  }
}

/**
 * Autocomplete search for products based on query
 * @param query - The search query to get suggestions for
 * @returns ApiResponse with an array of suggestions
 */
export async function autocompleteSearch(query: string): Promise<ApiResponse> {
  try {
    // If query is empty or too short, return empty results
    if (!query || query.trim().length < 2) {
      return successResponse("No suggestions available", { suggestions: [] });
    }

    // Generate cache key for autocomplete
    const cacheKey = generateCacheKey({
      type: "autocomplete",
      query: query.trim().toLowerCase(),
    });

    // Check if we have a valid cached result
    if (isValidCache(cacheKey)) {
      return successResponse(
        "Suggestions found",
        SEARCH_CACHE[cacheKey].result
      );
    }

    // Using the same search logic as searchWithFields
    const mustConditions: any[] = [];

    // Add text search with multi_match - same as searchWithFields
    mustConditions.push({
      multi_match: {
        query: query,
        fields: ["name^3", "supplier_catalog_number^3", "catalog_number^3"],
        type: "best_fields",
        fuzziness: "AUTO",
      },
    });

    // Build the optimized query - using a simplified version of buildSearchQuery
    const autocompleteQuery = {
      query: {
        bool: {
          must: mustConditions,
          must_not: COMMON_EXCLUSION_FILTERS,
        },
      },
      size: 25,
      _source: ["name", "catalog_number", "supplier_catalog_number", "urls"],
    };

    // Execute the search
    const result = await searchDocuments(PRODUCTS_INDEX, autocompleteQuery);

    // Extract hits safely
    const hits =
      result && typeof result === "object" && "hits" in result
        ? (result.hits as any)?.hits || []
        : [];

    // Extract unique suggestions
    // We'll use an array of objects with name, value, and type to provide more information
    const suggestions: Array<{ name: string; url: string; type: string }> = [];
    const seenValues = new Set<string>();

    // Process hits to extract suggestions with their types
    hits.forEach((hit: any) => {
      const source = hit._source;

      // Add product name
      if (source?.name && !seenValues.has(source.name)) {
        suggestions.push({
          name: `${source.name} | ${source.catalog_number} | ${source.supplier_catalog_number}`,
          url: source.urls?.gentaur,
          type: "Product Name",
        });
        seenValues.add(source.name);
      }

      // Add catalog number
      if (source?.catalog_number && !seenValues.has(source.catalog_number)) {
        suggestions.push({
          name: `${source.name} | ${source.catalog_number} | ${source.supplier_catalog_number}`,
          url: source.urls?.gentaur,
          type: "Gentaur CAT#",
        });
        seenValues.add(source.catalog_number);
      }

      // Add supplier catalog number
      if (
        source?.supplier_catalog_number &&
        !seenValues.has(source.supplier_catalog_number)
      ) {
        suggestions.push({
          name: `${source.name} | ${source.catalog_number} | ${source.supplier_catalog_number}`,
          url: source.urls?.gentaur,
          type: "Supplier CAT#",
        });
        seenValues.add(source.supplier_catalog_number);
      }
    });

    // Limit to 10 suggestions
    const limitedSuggestions = suggestions.slice(0, 25);

    // Cache the results
    SEARCH_CACHE[cacheKey] = {
      timestamp: Date.now(),
      result: { suggestions: limitedSuggestions },
    };

    return successResponse("Suggestions found successfully", {
      suggestions: limitedSuggestions,
    });
  } catch (error) {
    console.error("Autocomplete search error:", error);
    return errorResponse("Failed to fetch autocomplete suggestions", error);
  }
}

// Cleanup function to periodically clear expired cache entries
function cleanupCache() {
  const now = Date.now();
  Object.keys(SEARCH_CACHE).forEach((key) => {
    if (now - SEARCH_CACHE[key].timestamp > CACHE_TTL) {
      delete SEARCH_CACHE[key];
    }
  });
}

// Run cache cleanup every 15 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupCache, 15 * 60 * 1000);
}
