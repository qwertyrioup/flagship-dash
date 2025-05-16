'use server';

import { getOrders, OrderFilters } from '@/api/orders';

export async function fetchOrdersAction(filters: OrderFilters) {
    return getOrders(filters);
}