import { createResponse } from "@/lib/api-response";
import Order, { IOrder } from "@/models/Order";
import { connectToDatabase } from "@/lib/mongoose";
import { Types } from "mongoose";

export interface OrderFilters {
    page?: number;
    limit?: number;
    search?: string;
}

export interface OrderPayload {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
    clientId?: string;
    platform: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export async function getOrders(filters: OrderFilters = {}) {
    try {
        await connectToDatabase();
        const { page = 1, limit = 25, search = "" } = filters;

        const queryCondition = search.trim()
            ? {
                $or: [
                    { "user_details.email": { $regex: search, $options: "i" } },
                    { platform: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        const totalDocs = await Order?.countDocuments(queryCondition) || 0;

        const skip = (page - 1) * limit;

        // Explicitly define the type here to fix the type inference issue
        const docs = await Order?.find(queryCondition)
            .sort({createdAt: -1})
            .skip(skip)
            .limit(limit)
            .lean()
            .exec() as unknown as Array<IOrder & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }>;

        const orders: OrderPayload[] = docs.map((o) => ({
            _id: o._id.toString(),
            first_name: o.user_details.first_name,
            last_name: o.user_details.last_name,
            email: o.user_details.email,
            phone: o.user_details.phone,
            country: o.user_details.country,
            clientId: o.clientId?.toString(),
            platform: o.platform,
            status: o.status,
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
        }));

        const totalPages = Math.ceil(totalDocs / limit);

        return createResponse(true, "Orders fetched successfully", {
            orders,
            pagination: { total: totalDocs, page, limit, totalPages },
        });
    } catch (error: unknown) {
        console.error("getOrders error:", error);
        return createResponse(false, "Failed to fetch orders", { error });
    }
}
