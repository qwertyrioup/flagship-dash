import { getPageRedirections, PageRedirection } from "@/api/page-redirections";
import { PagesRedirectionsTableWrapper } from "@/components/pages-redirections-table-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePageRedirectionDialog } from "@/components/create-page-redirection-dialog";
import { ApiResponse } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

interface PageRedirectionResponse {
  data: PageRedirection[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function PagesPage() {
  const response = (await getPageRedirections() as unknown) as ApiResponse<{ body: PageRedirectionResponse }>;

  if (!response.success || !response.body?.body?.data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))]">
        <p className="text-destructive">Failed to load page redirections</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-height))] p-6">
      <div className="h-[calc(100%-6rem)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              
              Page Redirections
              
            <CreatePageRedirectionDialog />
              </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)]">
            <PagesRedirectionsTableWrapper
              initialData={response.body.body.data}
              initialPageCount={response.body.body.pagination.totalPages}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
