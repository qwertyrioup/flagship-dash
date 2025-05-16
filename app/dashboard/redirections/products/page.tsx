export const dynamic = 'force-dynamic';

import { getRedirections, Redirection } from "@/api/redirections";
import { RedirectionsTableWrapper } from "@/components/redirections-table-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiResponse } from "@/lib/api-response";

interface RedirectionsResponse {
  data: Redirection[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search = resolvedSearchParams.search || undefined;
 
  const response = (await getRedirections({ 
    limit: 100,
    page,
    search
  }) as unknown) as ApiResponse<{ body: RedirectionsResponse }>;

  if (!response.success || !response.body?.body?.data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))]">
        <p className="text-destructive">Failed to load product redirections</p>
      </div>
    );
  }

  const { data, pagination } = response.body.body;

  return (
    <div className="h-[calc(100vh-var(--header-height))] px-4 lg:px-6">
      <div className="h-[calc(100%-6rem)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Product Redirections</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)]">
            <RedirectionsTableWrapper
              data={data}
              pageCount={pagination.totalPages}
              currentPage={pagination.page}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
