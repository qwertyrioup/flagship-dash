import { validateTokenAndGetUser } from "@/api/auth";
import { generateMetadataHash } from "@/lib/metadata-utils";
import { connectToDatabase } from "@/lib/mongoose";
import BluePrint from "@/models/Blue_Print";
import GentaurProductExtension from "@/models/Gentaur_Product_Extension";
import Supplier from "@/models/Supplier";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Define ProcessError interface
interface ProcessError {
  type: 'validation' | 'duplication' | 'missing_field' | 'invalid_value' | 'unrecognized_field' | 'system_error' | 'permission_denied' | 'file_error' | 'info' | 'success' | 'warning' | 'summary_report';
  message: string;
  field?: string;
  value?: unknown;
  catalogNumber?: string;
  sheetName?: string;
  details?: string[];
  severity: 'error' | 'warning' | 'info' | 'success';
  code?: string;
  totalProducts?: number;
  validProducts?: number;
  errors?: number;
  duplications?: number;
  warnings?: number;
}

// Define proper types
interface Product {
  name: string;
  catalog_number: string;
  supplier_catalog_number: string;
  supplier: {
    id: string | number;
  };
  price: {
    buy: {
      currency: string;
      amount: number;
    };
    promotion_price: {
      amount: number;
    };
  };
  shipment: {
    dry_ice: boolean;
  };
  size: string;
  available: boolean;
  display: boolean;
  [key: string]: unknown;
}

interface Field {
  name: string;
  type: 'constant' | 'variable';
  value: Array<{
    name: string;
    properties?: Array<{
      name: string;
    }>;
  }>;
}

// Constants
const CHUNK_SIZE = 500;
const MAX_CACHE_SIZE = 1000;
const validCurrencies = new Set(["EUR", "USD", "GBP", "PLN", "JPY"]);
const aggressiveRegexCache = new Map<string, RegExp>();

// Create project temp directory if it doesn't exist
const PROJECT_TEMP_DIR = 'temp';
if (!fs.existsSync(PROJECT_TEMP_DIR)) {
  fs.mkdirSync(PROJECT_TEMP_DIR, { recursive: true });
}

// Essential fields for validation
const EssentialFields = [
  "name",
  "catalog_number",
  "supplier_catalog_number",
  "supplier.id",
  "price.buy.currency",
  "price.buy.amount",
  "price.promotion_price.amount",
  "shipment.dry_ice",
  "size",
  "available",
  "display",
];

// Helper function to create aggressive regex patterns
function createAggressiveRegex(input: string): RegExp {
  if (!aggressiveRegexCache.has(input)) {
    if (aggressiveRegexCache.size > MAX_CACHE_SIZE) {
      aggressiveRegexCache.clear();
    }
    const escapedInput = input.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedInput
      .split("")
      .map((char) => (/\w/.test(char) ? `${char}\\W*` : char.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")))
      .join("");
    aggressiveRegexCache.set(input, new RegExp(pattern, "i"));
  }
  return aggressiveRegexCache.get(input)!;
}

// Helper function to parse boolean values (used after validation)
function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (["true", "yes", "vrai"].includes(normalizedValue)) return true;
    if (["false", "no", "faux"].includes(normalizedValue)) return false;
  }
  return null;
}

// Helper function to validate boolean fields - returns ProcessError or null
function validateBooleanField(value: unknown, fieldName: string, productCatalogNumber: string): ProcessError | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return {
      type: 'missing_field',
      message: `"${fieldName}" cannot be empty. It must be "true" or "false".`,
      field: fieldName,
      catalogNumber: productCatalogNumber,
      severity: 'error',
      code: 'EMPTY_BOOLEAN_FIELD'
    };
  }

  const booleanString = String(value).trim().toLowerCase();
  if (booleanString !== "true" && booleanString !== "false") {
    return {
      type: 'invalid_value',
      message: `"${fieldName}" must be "true" or "false". Found: "${value}"`,
      field: fieldName,
      value: value,
      catalogNumber: productCatalogNumber,
      severity: 'error',
      code: 'INVALID_BOOLEAN_VALUE'
    };
  }
  return null;
}

// Helper function to validate price amount - returns ProcessError or null
function validatePriceAmount(priceAmount: unknown, fieldName: string, productCatalogNumber: string): ProcessError | null {
  if (priceAmount === null || priceAmount === undefined || String(priceAmount).trim() === "") {
    return {
      type: 'missing_field',
      message: `"${fieldName}" cannot be empty. It must be a valid number.`,
      field: fieldName,
      catalogNumber: productCatalogNumber,
      severity: 'error',
      code: 'EMPTY_PRICE_AMOUNT'
    };
  }

  const normalizedPriceAmount = String(priceAmount).replace(",", ".");
  const parsedPriceAmount = parseFloat(normalizedPriceAmount);

  if (isNaN(parsedPriceAmount)) {
    return {
      type: 'invalid_value',
      message: `"${fieldName}" must be a valid number. Found: "${priceAmount}"`,
      field: fieldName,
      value: priceAmount,
      catalogNumber: productCatalogNumber,
      severity: 'error',
      code: 'INVALID_PRICE_AMOUNT'
    };
  }

  if (parsedPriceAmount < 0) {
      return {
          type: 'invalid_value',
          message: `"${fieldName}" cannot be negative. Found: "${priceAmount}"`,
          field: fieldName,
          value: priceAmount,
          catalogNumber: productCatalogNumber,
          severity: 'error',
          code: 'NEGATIVE_PRICE_AMOUNT'
      };
  }

  return null;
}

// Helper function to validate additional fields - returns array of ProcessError
function validateAdditionalFields(
  finalProduct: Product,
  additionalFieldNames: string[],
  fields: Field[]
): ProcessError[] {
  const errors: ProcessError[] = [];

  for (const key of Object.keys(finalProduct)) {
    const trimmedKey = key.trim();

    if (additionalFieldNames.includes(trimmedKey)) {
      const foundField = fields.find((field) => field.name.trim() === trimmedKey);
      if (!foundField) continue;

      const { value: allowedValues, type } = foundField;

      if (type === "constant") {
        const rawValue = finalProduct[trimmedKey];
        const trimmedRawValue = String(rawValue || '').trim();

        if (trimmedRawValue.toLowerCase() === "n/a") {
          finalProduct[trimmedKey] = [];
          continue;
        }

        if (trimmedRawValue === "") {
          errors.push({
            type: 'missing_field',
            message: `Constant field "${trimmedKey}" cannot be empty.`,
            field: trimmedKey,
            catalogNumber: finalProduct.catalog_number,
            severity: 'error',
            code: 'EMPTY_CONSTANT_FIELD'
          });
          continue;
        }

        const inputValues = trimmedRawValue
          .split(",")
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);

        const matchedItems = new Set<string>();
        const subErrors: string[] = [];

        for (const inputValue of inputValues) {
          let matchFound = false;

          for (const itemValue of allowedValues) {
            if (itemValue.properties && itemValue.properties.length > 0) {
              for (const prop of itemValue.properties) {
                const regex = createAggressiveRegex(prop.name);
                if (regex.test(inputValue)) {
                  matchFound = true;
                  matchedItems.add(itemValue.name);
                  break;
                }
              }
              if (matchFound) break;
            }

            if (!matchFound) {
              const regex = createAggressiveRegex(itemValue.name);
              if (regex.test(inputValue)) {
                matchFound = true;
                matchedItems.add(itemValue.name);
                break;
              }
            }
          }

          if (!matchFound) {
            subErrors.push(`Input value "${inputValue}" does not match any allowed constant for "${trimmedKey}".`);
          }
        }

        if (subErrors.length > 0) {
          errors.push({
            type: 'invalid_value',
            message: `Constant field "${trimmedKey}" contains unrecognized values.`,
            field: trimmedKey,
            value: rawValue,
            catalogNumber: finalProduct.catalog_number,
            severity: 'error',
            code: 'UNRECOGNIZED_CONSTANT_VALUE',
            details: subErrors
          });
        }

        if (matchedItems.size > 0) {
          finalProduct[trimmedKey] = Array.from(matchedItems);
        } else if (inputValues.length > 0 && subErrors.length === inputValues.length) {
            finalProduct[trimmedKey] = []; // If inputs exist but none matched, empty the field
        }


      } else if (type === "variable") {
        const variableValue = finalProduct[trimmedKey];
        const trimmedVariableValue = String(variableValue || '').trim();

        if (trimmedVariableValue.toLowerCase() === "n/a") {
          finalProduct[trimmedKey] = "";
          continue;
        }

        if (trimmedVariableValue === "") {
          errors.push({
            type: 'missing_field',
            message: `Variable field "${trimmedKey}" cannot be empty.`,
            field: trimmedKey,
            catalogNumber: finalProduct.catalog_number,
            severity: 'error',
            code: 'EMPTY_VARIABLE_FIELD'
          });
          continue;
        }
        finalProduct[trimmedKey] = trimmedVariableValue; // Store the trimmed value
      }
    }
  }
  return errors;
}

// Helper function to get all keys with dot notation
function getAllKeysWithDotNotation(obj: Record<string, unknown>, prefix = ""): string[] {
  let keys: string[] = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getAllKeysWithDotNotation(obj[key] as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

// Helper function to process a chunk of products - returns ProcessError[] and valid products
function processProductChunk(
  chunk: any[],
  supplierId: number,
  sheetName: string,
  additionalFieldNames: string[],
  fields: any[],
  globalSupplierCatalogNumbers: Set<string> // Passed by reference to check global duplicates
): { errors: ProcessError[]; finalValidData: any[]; } {
  const chunkErrors: ProcessError[] = [];
  const finalValidData: any[] = [];
  const chunkProcessedCatalogNumbers = new Set<string>(); // To check duplicates within the current chunk efficiently

  for (const product of chunk) {
    const productSpecificErrors: ProcessError[] = [];
    const productCatalogNumber = product["catalog_number"];

    // Early check for missing or invalid catalog number
    if (!productCatalogNumber || typeof productCatalogNumber !== 'string' || String(productCatalogNumber).trim() === '') {
        productSpecificErrors.push({
            type: 'missing_field',
            message: `Missing or invalid "catalog_number". This product cannot be fully processed.`,
            field: 'catalog_number',
            sheetName: sheetName,
            severity: 'error',
            code: 'MISSING_OR_INVALID_CATALOG_NUMBER'
        });
        chunkErrors.push(...productSpecificErrors);
        continue; // Skip further validation for this product
    }

    // Check for duplicates within the current chunk
    if (chunkProcessedCatalogNumbers.has(productCatalogNumber)) {
      productSpecificErrors.push({
        type: 'duplication',
        message: `Duplicate catalog number "${productCatalogNumber}" found within the current sheet/chunk.`,
        field: 'catalog_number',
        catalogNumber: productCatalogNumber,
        sheetName: sheetName,
        severity: 'error',
        code: 'CHUNK_DUPLICATE_CATALOG_NUMBER'
      });
    } else {
      chunkProcessedCatalogNumbers.add(productCatalogNumber);
      // Check for global duplicates (across all processed chunks)
      if (globalSupplierCatalogNumbers.has(productCatalogNumber)) {
        productSpecificErrors.push({
          type: 'duplication',
          message: `Duplicate catalog number "${productCatalogNumber}" found across different parts of the file.`,
          field: 'catalog_number',
          catalogNumber: productCatalogNumber,
          sheetName: sheetName,
          severity: 'error',
          code: 'GLOBAL_DUPLICATE_CATALOG_NUMBER'
        });
      } else {
        globalSupplierCatalogNumbers.add(productCatalogNumber);
      }
    }

    // Check for unrecognized fields
    const allProductKeys = getAllKeysWithDotNotation(product);
    allProductKeys.forEach((key) => {
      // Ignore keys that are null/undefined or empty strings after trimming, often these are just empty cells
      if (product[key] === null || product[key] === undefined || (typeof product[key] === 'string' && product[key].trim() === '')) {
          return;
      }
      if (![...EssentialFields, ...additionalFieldNames].includes(String(key).trim())) {
        productSpecificErrors.push({
          type: 'unrecognized_field',
          message: `Unrecognized field: "${key}" found in product.`,
          field: key,
          catalogNumber: productCatalogNumber,
          sheetName: sheetName,
          severity: 'warning',
          code: 'UNRECOGNIZED_PRODUCT_FIELD'
        });
      }
    });

    // Essential fields validation
    EssentialFields.forEach((field) => {
      // Special handling for promotion_price.amount if it can be empty
      if (field === "price.promotion_price.amount") {
          if (product[field] === undefined || product[field] === null || String(product[field]).trim() === '') {
              product[field] = null; // Normalize empty promotion price to null
              return; // Skip further validation for this specific optional field if empty
          }
      }

      if (product[field] === undefined || product[field] === null || (typeof product[field] === 'string' && product[field].trim() === '')) {
        productSpecificErrors.push({
          type: 'missing_field',
          message: `Missing essential field: "${field}".`,
          field: field,
          catalogNumber: productCatalogNumber,
          sheetName: sheetName,
          severity: 'error',
          code: 'MISSING_ESSENTIAL_FIELD'
        });
      }
    });

    // Supplier ID validation
    const parsedSupplierId = Number(product["supplier.id"]);
    if (isNaN(parsedSupplierId) || parsedSupplierId !== Number(supplierId)) {
      productSpecificErrors.push({
        type: 'invalid_value',
        message: `Invalid supplier ID. Expected "${supplierId}", found "${product["supplier.id"]}".`,
        field: 'supplier.id',
        value: product["supplier.id"],
        catalogNumber: productCatalogNumber,
        sheetName: sheetName,
        severity: 'error',
        code: 'INVALID_SUPPLIER_ID'
      });
    }

    // Currency validation
    const currency = String(product["price.buy.currency"] || "")
      .toUpperCase()
      .trim();
    if (!validCurrencies.has(currency)) {
      productSpecificErrors.push({
        type: 'invalid_value',
        message: `Invalid currency. Expected one of [${Array.from(validCurrencies).join(", ")}], found "${product["price.buy.currency"]}".`,
        field: 'price.buy.currency',
        value: product["price.buy.currency"],
        catalogNumber: productCatalogNumber,
        sheetName: sheetName,
        severity: 'error',
        code: 'INVALID_CURRENCY'
      });
    } else {
        product["price.buy.currency"] = currency; // Normalize currency value
    }

    // Price amount validation
    const priceAmountError = validatePriceAmount(
      product["price.buy.amount"],
      "price.buy.amount",
      productCatalogNumber
    );
    if (priceAmountError) {
      productSpecificErrors.push(priceAmountError);
    } else {
      product["price.buy.amount"] = parseFloat(String(product["price.buy.amount"]).replace(",", ".")); // Normalize amount
    }

    // Promotion Price amount validation (only if not null/empty and not handled by essential field check)
    if (product["price.promotion_price.amount"] !== null) { // if it was set to null by essential fields check, skip
        const promoPriceAmountError = validatePriceAmount(
            product["price.promotion_price.amount"],
            "price.promotion_price.amount",
            productCatalogNumber
        );
        if (promoPriceAmountError) {
            productSpecificErrors.push(promoPriceAmountError);
        } else {
            product["price.promotion_price.amount"] = parseFloat(String(product["price.promotion_price.amount"]).replace(",", ".")); // Normalize amount
        }
    }


    // Boolean fields validation and normalization
    const booleanFields = [
      { field: "shipment.dry_ice", name: "shipment.dry_ice" },
      { field: "available", name: "available" },
      { field: "display", name: "display" },
    ];
    for (const { field, name } of booleanFields) {
      const booleanError = validateBooleanField(
        product[field],
        name,
        productCatalogNumber
      );
      if (booleanError) {
        productSpecificErrors.push(booleanError);
      } else {
        product[field] = parseBoolean(product[field]); // Normalize boolean value
      }
    }

    // Additional fields validation
    const additionalErrors = validateAdditionalFields(
      product,
      additionalFieldNames,
      fields
    );
    productSpecificErrors.push(...additionalErrors);

    // If there are any errors for this product, add them to chunkErrors
    if (productSpecificErrors.length > 0) {
      chunkErrors.push(...productSpecificErrors);
    } else {
      // Only add to finalValidData if product is completely valid
      finalValidData.push({ ...product, validated: true });
    }
  }

  return {
    errors: chunkErrors,
    finalValidData,
  };
}

// Helper function to split array into chunks
function splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function GET(request: NextRequest) {
  // Connect to database
  await connectToDatabase();

  const encoder = new TextEncoder();
  const initialResponse = encoder.encode("data: {\"status\":\"connected\", \"message\":\"Database connected, starting process...\", \"type\":\"info\", \"severity\":\"info\"}\n\n");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(initialResponse);

      // Helper to send structured messages
      const sendMessage = async (data: ProcessError | object) => {
        const formattedData = JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${formattedData}\n\n`));
        // Add a small delay to help with buffering issues in some environments (optional)
        await new Promise(resolve => setTimeout(resolve, 10));
      };

      const fullPathRef = { value: '' }; // Use a ref to hold fullPath for finally block

      try {
        const url = new URL(request.url);
        const supplierId = Number(url.searchParams.get('supplierId'));
        const filePath = url.searchParams.get('filePath');

        if (!supplierId || !filePath) {
          await sendMessage({ type: 'system_error', message: "Missing required parameters (supplierId or filePath).", severity: 'error', code: 'MISSING_PARAMS' });
          return;
        }

        const fileName = filePath.replace(/^\/temp\//, '');
        const fullPath = path.join(PROJECT_TEMP_DIR, fileName);
        fullPathRef.value = fullPath; // Store fullPath in the ref

        if (!fs.existsSync(fullPath)) {
          await sendMessage({ type: 'file_error', message: `File not found: ${filePath}`, severity: 'error', code: 'FILE_NOT_FOUND' });
          return;
        }

        // // Verify user authentication
        // const cookieStore = cookies();
        // const token = cookieStore.get('auth_token')?.value;

        // if (!token) {
        //   await sendMessage({ type: 'permission_denied', message: "No authentication token found.", severity: 'error', code: 'AUTH_TOKEN_MISSING' });
        //   return;
        // }

        // const authResponse = await validateTokenAndGetUser(token);

        // if (!authResponse.success || !authResponse.body?.user) {
        //   await sendMessage({ type: 'permission_denied', message: "Authentication failed or user not found.", severity: 'error', code: 'AUTH_FAILED' });
        //   return;
        // }

        // const user = authResponse.body.user;
        // const hasPermission = user.role?.permissions?.some(
        //   (permission: any) => permission.resource === 'product.auto-checker'
        // );

        // if (!hasPermission) {
        //   await sendMessage({ type: 'permission_denied', message: "Sorry, you don't have permission to perform this action.", severity: 'error', code: 'PERMISSION_DENIED' });
        //   return;
        // }
        // End authentication block

        const additionalFieldsDocument = await GentaurProductExtension.findOne({
          name: "gentaur_products_additional_fields",
        }).lean(); // Use .lean() for faster retrieval

        if (!additionalFieldsDocument) {
          await sendMessage({ type: 'system_error', message: "Additional fields document not found in database.", severity: 'error', code: 'METADATA_NOT_FOUND' });
          return;
        }

        const { fields } = additionalFieldsDocument;
        const additionalFieldNames = fields.map((field: any) => field.name);

        await sendMessage({ type: 'info', message: "Starting file processing...", severity: 'info' });

        let workbook;
        try {
          workbook = new ExcelJS.stream.xlsx.WorkbookReader(fullPath, {
            entries: "emit",
            sharedStrings: "cache",
          });
        } catch (err: any) {
          await sendMessage({ type: 'file_error', message: `Error opening Excel file: ${err.message}`, severity: 'error', code: 'EXCEL_OPEN_ERROR' });
          return;
        }

        const metadata: any[] = [];
        const allProducts: any[] = [];
        let processedRows = 0;

        const globalSupplierCatalogNumbers = new Set<string>(); // Tracks all catalog numbers processed so far
        const allProcessingErrors: ProcessError[] = []; // Accumulate all errors here

        for await (const worksheet of workbook) {
          const sheetName = (worksheet as any).name || 'Sheet';
          await sendMessage({ type: 'info', message: `Processing sheet: "${sheetName}"`, sheetName: sheetName, severity: 'info' });

          const sheetProducts: any[] = [];
          const sheetMetadata = {
            sheetName,
            rowCount: 0,
            headers: [] as string[],
          };

          let rowIndex = 0;
          let headers: string[] = [];

          for await (const row of worksheet) {
            rowIndex++;
            if (rowIndex === 1) {
              headers = [];
              row.eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString().trim() || `Column${colNumber}`;
              });

              if (!headers || headers.filter(Boolean).length === 0) {
                const noHeaderError: ProcessError = {
                    type: 'file_error',
                    message: `Sheet "${sheetName}" has no detectable headers. Skipping this sheet.`,
                    sheetName: sheetName,
                    severity: 'warning',
                    code: 'NO_SHEET_HEADERS'
                };
                allProcessingErrors.push(noHeaderError);
                await sendMessage(noHeaderError);
                continue;
              }
              sheetMetadata.headers = headers.slice(1).filter(Boolean); // Assuming column 0 might be empty/row number
              continue;
            }

            let hasValues = false;
            row.eachCell(() => { hasValues = true; });
            if (!hasValues) continue; // Skip truly empty rows

            const productData: any = {};
            row.eachCell((cell, colNumber) => {
              if (headers[colNumber]) {
                productData[headers[colNumber]] = typeof cell.value === 'string' ? cell.value.trim() : cell.value ?? null;
              }
            });

            if (Object.keys(productData).length > 0) {
              sheetProducts.push(productData);
              processedRows++;

              if (processedRows % CHUNK_SIZE === 0) {
                await sendMessage({ type: 'info', message: `Processed ${processedRows} products...`, severity: 'info' });
              }
            }
          }

          sheetMetadata.rowCount = rowIndex - 1; // Subtract header row
          metadata.push(sheetMetadata);
          allProducts.push(...sheetProducts);
        }

        if (allProducts.length === 0) {
          await sendMessage({ type: 'info', message: "No products found in the file after initial parsing.", severity: 'info', code: 'NO_PRODUCTS_FOUND' });
          await sendMessage({ type: 'success', message: "Process completed with no products to validate.", severity: 'success' });
          return;
        }

        await sendMessage({ type: 'info', message: `Finished reading file. Total products found: ${allProducts.length}. Starting validation...`, severity: 'info' });

        const metadataHash = generateMetadataHash(metadata, allProducts);
        await sendMessage({ type: 'info', message: `Metadata hash generated: ${metadataHash}`, severity: 'info' });

        // Process products in chunks for validation
        const chunks = splitIntoChunks(allProducts, CHUNK_SIZE);
        let currentChunkIndex = 0;

        for (const chunk of chunks) {
          currentChunkIndex++;
          await sendMessage({
            type: 'info',
            message: `Processing validation chunk ${currentChunkIndex} of ${chunks.length} (${chunk.length} products)...`,
            severity: 'info'
          });

          const { errors: chunkResultsErrors } = processProductChunk(
            chunk,
            supplierId,
            "Main Sheet", // Assuming single sheet; adapt if multiple sheets need distinct processing context
            additionalFieldNames,
            fields,
            globalSupplierCatalogNumbers
          );

          allProcessingErrors.push(...chunkResultsErrors);
        }

        // --- Summarize and Send Final Results ---
        const validationErrors = allProcessingErrors.filter(e =>
            (e.type === 'validation' || e.type === 'missing_field' || e.type === 'invalid_value' || e.type === 'system_error' || e.type === 'permission_denied' || e.type === 'file_error')
            && e.severity === 'error'
        );
        const duplicationErrors = allProcessingErrors.filter(e => e.type === 'duplication' && e.severity === 'error');
        const warningMessages = allProcessingErrors.filter(e => e.severity === 'warning');

        // Send validation errors in batches
        if (validationErrors.length > 0) {
          const errorBatches = splitIntoChunks(validationErrors, 50); // Batch for display
          for (const batch of errorBatches) {
            await sendMessage({
              type: 'validation',
              message: `Validation errors found: ${batch.length} issues in this batch.`,
              details: batch.map(e => `[${e.code}] ${e.message} ${e.field ? `(Field: ${e.field})` : ''} ${e.catalogNumber ? `(Product: ${e.catalogNumber})` : ''}`),
              severity: 'error',
              code: 'VALIDATION_BATCH'
            });
          }
        }

        // Send duplication errors
        if (duplicationErrors.length > 0) {
          await sendMessage({
            type: 'duplication',
            message: `Duplication errors found: ${duplicationErrors.length} duplicates.`,
            details: duplicationErrors.map(e => `[${e.code}] ${e.message} (Product: ${e.catalogNumber})`),
            severity: 'error',
            code: 'DUPLICATION_SUMMARY'
          });
        }

        // Send warnings (e.g., unrecognized fields)
        if (warningMessages.length > 0) {
            const uniqueWarningFields = new Set<string>();
            warningMessages.forEach(err => { if(err.field) uniqueWarningFields.add(err.field); });

            await sendMessage({
                type: 'warning',
                message: `Warnings found: ${warningMessages.length} issues${uniqueWarningFields.size > 0 ? ` (e.g., unrecognized fields: ${Array.from(uniqueWarningFields).join(", ")})` : ''}.`,
                details: warningMessages.map(e => `[${e.code}] ${e.message} ${e.field ? `(Field: ${e.field})` : ''} ${e.catalogNumber ? `(Product: ${e.catalogNumber})` : ''}`),
                severity: 'warning',
                code: 'WARNING_SUMMARY'
            });
        }

        // If no critical errors, update BluePrint
        if (validationErrors.length === 0 && duplicationErrors.length === 0) {
          try {
            await BluePrint.findOneAndUpdate(
              { name: 'auto-checker' },
              { $addToSet: { files: metadataHash } },
              { new: true, upsert: true }
            );
            await sendMessage({ type: 'success', message: "All products passed validation.", severity: 'success' });
            await sendMessage({ type: 'success', message: "Blue Print Saved 👌.", severity: 'success' });
          } catch (error: any) {
            await sendMessage({ type: 'system_error', message: `Failed to save BluePrint: ${error.message}`, severity: 'error', code: 'BLUEPRINT_SAVE_FAILED' });
          }
        } else {
            await sendMessage({ type: 'info', message: "Validation completed with errors/warnings. BluePrint not updated.", severity: 'info' });
        }

        // Final summary message
        await sendMessage({
          type: 'summary_report',
          message: "Processing Summary",
          totalProducts: allProducts.length,
          validProducts: allProducts.length - validationErrors.length - duplicationErrors.length,
          errors: validationErrors.length,
          duplications: duplicationErrors.length,
          warnings: warningMessages.length,
          severity: 'info',
          code: 'FINAL_SUMMARY'
        });

        await sendMessage({ type: 'success', message: "Process Completed.", severity: 'success' });

      } catch (error: any) {
        console.error('Error in GET handler:', error);
        await sendMessage({ type: 'system_error', message: `An unexpected server error occurred: ${error.message}`, details: [error.stack], severity: 'error', code: 'UNEXPECTED_SERVER_ERROR' });
      } finally {
        // Clean up temp file regardless of success or failure
        try {
          if (fs.existsSync(fullPathRef.value)) {
            fs.unlinkSync(fullPathRef.value);
            await sendMessage({ type: 'info', message: "Temporary file cleaned up successfully.", severity: 'info' });
          }
        } catch (error: any) {
          await sendMessage({ type: 'system_error', message: `Error cleaning up temporary file: ${error.message}`, severity: 'error', code: 'TEMP_FILE_CLEANUP_FAILED' });
        }
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  await connectToDatabase()
  
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = Number(formData.get('supplierId'));

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    }

    if (!supplierId) {
      return new Response(JSON.stringify({ error: "No supplier ID provided" }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    }

    const supplier = await Supplier.findOne({ id: supplierId });

    if (!supplier) {
      return new Response(JSON.stringify({ error: "Supplier not found" }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    }

    // Save uploaded file to project temp directory
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    const tempFilePath = path.join(PROJECT_TEMP_DIR, fileName);
    fs.writeFileSync(tempFilePath, fileBuffer);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "File uploaded successfully",
      supplierId,
      tempFilePath: `/temp/${fileName}` // Include /temp/ in the path
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Credentials': 'true'
      }
    });

  } catch (error: any) {
    console.error('Error in POST handler:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error" 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  }
} 