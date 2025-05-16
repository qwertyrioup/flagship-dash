export const dynamic = 'force-dynamic';

import { getOrders } from '@/api/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrdersTable } from '@/components/orders/orders-table';

export default async function OrdersPage() {
    const res = await getOrders({ page: 1, limit: 25 });


    // Safe narrowing to ensure `res.body` exists and contains `orders`
    if (!res.success || !res.body || !('orders' in res.body)) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))]">
                <p className="text-destructive">Failed to load orders</p>
            </div>
        );
    }

    const orders = res.body.orders || [];
    const pagination = res.body.pagination || { totalPages: 0, page: 1 };

    return (
        <div className="h-[calc(100vh-var(--header-height))] p-6">
            <div className="h-[calc(100%-6rem)]">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-4rem)]">
                        <OrdersTable
                            initialData={orders}
                            initialPageCount={pagination.totalPages}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
