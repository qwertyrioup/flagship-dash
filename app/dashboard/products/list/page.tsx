export const dynamic = 'force-dynamic';

import { searchWithFields } from "@/api/elastic-advanced-search";
import { ProductsTable } from "@/components/products-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiResponse } from "@/lib/api-response";

interface Product {
  _id: string;
  id: string;
  catalog_number: string;
  name: string;
  supplier_id: string;
  supplier_name: string;
  size: string;
  buy_price: number;
  sell_price: number;
  discontinued: boolean;
}

interface SearchResponse {
  products: Product[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any[];
  total: number;
  pages: number;
  took: number;
}

export default async function ProductsPage() {
  const response = await searchWithFields(1, "", []) as ApiResponse<SearchResponse>;

  if (!response.success || !response.body) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))]">
        <p className="text-destructive">Failed to load products</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-height))] p-6">
      <div className="h-[calc(100%-6rem)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)]">
            <ProductsTable
              initialData={response.body.products}
              initialPageCount={response.body.pages}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
