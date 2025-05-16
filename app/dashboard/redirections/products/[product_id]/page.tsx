import { getRedirections, Redirection } from "@/api/redirections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    product_id: string;
  }>;
}

interface URLData {
  old_url: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  body?: T;
}

export default async function ProductDetailPage({ params }: PageProps) {
  try {
    const { product_id } = await params;
    
    // Validate product_id is a valid number
    if (!/^\d+$/.test(product_id)) {
      console.log('Invalid product ID format:', product_id);
      notFound();
    }

    const response = (await getRedirections({ search: product_id }) as unknown) as ApiResponse<{ body: { data: Redirection[] } }>;
    

    if (!response.success) {
      console.log('API request failed');
      notFound();
    }

    if (!response.body?.body?.data?.length) {
      console.log('No data found for product ID:', product_id);
      notFound();
    }

    const redirection = response.body.body.data[0];

    return (
      <div className="w-full py-8 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard/redirections/products">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Products
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
            <p className="text-muted-foreground mt-1">Product ID: {redirection.product_id}</p>
          </div>
          <Badge 
            variant={redirection.active ? "default" : "destructive"}
            className="px-4 py-1.5 text-sm"
          >
            {redirection.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-8">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Gentaur URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {redirection.platform.gentaur.map((url: URLData, index: number) => (
                  <div key={index} className="flex flex-col gap-2">
                    <a 
                      href={url.old_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline break-all text-sm"
                    >
                      {url.old_url}
                    </a>
                    <span className="text-sm text-muted-foreground">
                      Created: {format(new Date(url.createdAt), "PPp")}
                    </span>
                    {index < redirection.platform.gentaur.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Genprice URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {redirection.platform.genprice.map((url: URLData, index: number) => (
                  <div key={index} className="flex flex-col gap-2">
                    <a 
                      href={url.old_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline break-all text-sm"
                    >
                      {url.old_url}
                    </a>
                    <span className="text-sm text-muted-foreground">
                      Created: {format(new Date(url.createdAt), "PPp")}
                    </span>
                    {index < redirection.platform.genprice.length - 1 && (
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
  } catch (error) {
    console.error('Error in ProductDetailPage:', error);
    notFound();
  }
}
