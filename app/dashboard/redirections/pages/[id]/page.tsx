import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getPageRedirections, PageRedirection } from "@/api/page-redirections";
import { ApiResponse } from "@/lib/api-response";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface LinkRedirected {
  url: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PageRedirectionResponse {
  data: PageRedirection[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function PageRedirectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  const response = await getPageRedirections({ id }) as ApiResponse<{ body: PageRedirectionResponse }>;
  
  if (!response.success || !response.body?.body?.data?.length) {
    notFound();
  }

  const redirection = response.body.body.data[0];

  return (
    <div className="w-full py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/redirections/pages">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Pages
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Page Redirection Details</h1>
          <p className="text-muted-foreground mt-1">Platform: {redirection.platform}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={redirection.status ? "default" : "destructive"} className="px-4 py-1.5 text-sm">
            {redirection.status ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline" className="px-4 py-1.5 text-sm">
            {redirection.type}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Redirect To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <span className="text-sm break-all">
                {redirection.url_to}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Redirected URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {redirection.urls_from.map((url: LinkRedirected, index: number) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm break-all">
                      {url.url}
                    </span>
                    <Badge 
                      variant={url.active ? "default" : "destructive"}
                      className="ml-2"
                    >
                      {url.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Created: {format(new Date(url.createdAt), "PPp")}
                  </span>
                  {index < redirection.urls_from.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Created</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(redirection.createdAt), "PPp")}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(redirection.updatedAt), "PPp")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 