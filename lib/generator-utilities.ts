import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

interface GeneratorOptions {
  type: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // ... other options as needed
}

interface GeneratorResult {
  value: string;
  metadata?: Record<string, unknown>;
}

export async function processDatasetToJson(
  data: any[],
  folderName: string,
  additionalFields: string[],
  outputDir: string,
  onProgress: (message: string) => void
): Promise<void> {
  try {
    const folderPath = path.join(outputDir, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const jsonFilePath = path.join(folderPath, 'data.json');
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(jsonFilePath, jsonData);

    onProgress(`Successfully wrote ${data.length} records to ${jsonFilePath}`);
  } catch (error) {
    onProgress(`Error processing dataset to JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function processDatasetFromJson(
  data: any[],
  folderName: string,
  additionalFields: string[],
  outputDir: string,
  onProgress: (message: string) => void
): Promise<void> {
  try {
    const folderPath = path.join(outputDir, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Get all unique keys from the data
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    additionalFields.forEach(field => allKeys.add(field));

    // Add headers
    const headers = Array.from(allKeys);
    worksheet.addRow(headers);

    // Add data rows
    data.forEach(item => {
      const rowData = headers.map(header => {
        const value = header.split('.').reduce((obj, key) => obj?.[key], item);
        return value ?? '';
      });
      worksheet.addRow(rowData);
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Save the workbook
    const excelFilePath = path.join(folderPath, 'data.xlsx');
    await workbook.xlsx.writeFile(excelFilePath);

    onProgress(`Successfully wrote ${data.length} records to ${excelFilePath}`);
  } catch (error) {
    onProgress(`Error processing dataset from JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

function generateValue(options: GeneratorOptions): GeneratorResult {
  const { type, minLength = 0, maxLength = 100, pattern } = options;
  
  let value = '';
  
  switch (type) {
    case 'string':
      value = generateRandomString(minLength, maxLength);
      break;
    case 'number':
      value = generateRandomNumber(minLength, maxLength).toString();
      break;
    case 'pattern':
      if (pattern) {
        value = generateFromPattern(pattern, minLength, maxLength);
      }
      break;
    default:
      value = generateRandomString(minLength, maxLength);
  }
  
  return {
    value,
    metadata: {
      type,
      minLength,
      maxLength,
      pattern
    }
  };
}

function generateRandomString(minLength: number, maxLength: number): string {
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFromPattern(pattern: string, minLength: number, maxLength: number): string {
  // Basic pattern implementation - can be expanded based on needs
  return generateRandomString(minLength, maxLength);
}

function validateOptions(options: GeneratorOptions): boolean {
  if (!options.type) {
    return false;
  }

  const { minLength, maxLength } = options;
  
  if (minLength !== undefined && maxLength !== undefined) {
    if (minLength < 0 || maxLength < 0 || minLength > maxLength) {
      return false;
    }
  }

  if (options.type === 'pattern' && !options.pattern) {
    return false;
  }

  return true;
}
