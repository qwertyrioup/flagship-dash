import { Schema, Document, model, Model, models, Types } from "mongoose";

/**
 * User Details Interface
 */
export interface IUserDetails {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
}

/**
 * Billing Details Interface
 */
export interface IBillingDetails {
    total: string;
    company_discount: string;
    lab_discount: string;
    client_own_discount: string;
    total_discount: string;
    total_after_discount: string;
    allowed_products_discount: string;
    allowed_products: unknown[];
    not_allowed_products: unknown[];
}

/**
 * Order Interface
 */
export interface IOrder extends Document {
    user_details: IUserDetails;
    clientId?: Types.ObjectId;
    cart: Record<string, unknown>;
    billing?: IBillingDetails;
    comment?: string;
    platform: string;
    status:
        | "pending"
        | "in progress"
        | "shipped"
        | "delivered"
        | "canceled"
        | "refunded";
}

/**
 * Order Schema
 */
const OrderSchema = new Schema(
    {
        user_details: {
            type: {
                first_name: { type: String, required: true },
                last_name: { type: String, required: true },
                email: { type: String, required: true },
                phone: { type: String, required: true },
                country: { type: String, required: true },
            },
            required: true,
        },
        clientId: {
            type: Schema.Types.ObjectId,
            ref: "Client",
            required: false,
        },
        cart: {
            type: Schema.Types.Mixed,
            required: true,
        },
        billing: {
            type: {
                total: { type: String, required: true },
                company_discount: { type: String, required: true },
                lab_discount: { type: String, required: true },
                client_own_discount: { type: String, required: true },
                total_discount: { type: String, required: true },
                total_after_discount: { type: String, required: true },
                allowed_products_discount: { type: String, required: true },
                allowed_products: { type: [Schema.Types.Mixed], default: [] },
                not_allowed_products: { type: [Schema.Types.Mixed], default: [] },
            },
            required: false,
        },
        comment: { type: String },
        platform: { type: String, required: true },
        status: {
            type: String,
            enum: [
                "pending",
                "in progress",
                "shipped",
                "delivered",
                "canceled",
                "refunded",
            ],
            default: "pending",
            required: true,
        },
    },
    { timestamps: true }
);

// Make sure this code only runs on the server
const Order = (typeof window === 'undefined') ?
    (models.Order || model<IOrder>("Order", OrderSchema)) :
    null;

export default Order;