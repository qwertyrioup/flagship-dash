import { getSuppliers } from "@/api/suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoCheckerForm } from "./auto-checker-form";

export const dynamic = 'force-dynamic';

type Supplier = {
  id: number;
  name: string;
}

export default async function Page() {
  const suppliers = (await getSuppliers()) as Supplier[];

  return (
    <div className="h-[calc(100vh-var(--header-height))] p-6 flex items-start justify-center">
      <Card className="w-full max-w-7xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Auto Checker Catalog Number</CardTitle>
        </CardHeader>
        <CardContent>
          <AutoCheckerForm suppliers={suppliers} />
        </CardContent>
      </Card>
    </div>
  );
}

