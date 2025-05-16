import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * ---------------------------
 * TypeScript Interfaces
 * ---------------------------
 */

/**
 * Currency Amount Interface
 */
interface CurrencyAmount {
  currency: string;
  amount: string;
}

/**
 * Sell Price Interface
 */
interface SellPrice extends CurrencyAmount {
  valid_until_date: Date | null;
  date_added: Date;
  date_updated: Date;
}

interface PromotionPrice extends CurrencyAmount {
    valid_until_date: Date | null;
    date_added: Date;
    date_updated: Date;
}

/**
 * Buy Price Interface
 */
interface BuyPrice extends CurrencyAmount {}

/**
 * Price Interface
 */
interface Price {
  buy: BuyPrice;
  sell: SellPrice;
  promotion_price: PromotionPrice;
}

/**
 * Supplier Interface
 */
interface Supplier {
  id: number;
  name: string;
  discount: number | null;
  shipping_cost: number | null;
  shipping_cost_dry_ice: number | null;
  bank_fee: number | null;
  invoice_surcharges: number | null;
  margin: number;
  flat_rate: number | null;
}

/**
 * Shipment Interface
 */
interface Shipment {
  dry_ice: boolean;
  final_shipping_cost: number;
}

/**
 * Supplier Category Interface
 */
interface SupplierCategory {
  id: number | null;
  name: string;
}

/**
 * Category Interface
 */
interface Category {
  id: number | null;
  name: string;
  supplier_category: SupplierCategory;
}

/**
 * Filter Interface
 */
interface Filter {
  filter: string;
  value: string;
}

/**
 * Featured Image Interface
 */
interface FeaturedImage {
  url: string;
}

/**
 * Image Interface
 */
interface Image {
  url: string;
}

/**
 * Main Gentaur Product Document Interface
 */
export interface IGentaur_Product extends Document {
  id: number;
  new_id: number;
  name: string;
  type: string;
  catalog_number: string;
  supplier_catalog_number: string;
  supplier: Supplier;
  price: Price;
  shipment: Shipment;
  size: string;
  sell_price: string;
  additional_information: string | null;
  description: string | null;
  specifications: string | null;
  storage_and_shipping: string | null;
  notes: string | null;
  cluster_name: string | null;
  featured_image: string[];
  images: string[];
  date_added: Date;
  date_updated: Date;
  available: boolean;
  variations: string;
  sync: boolean;
  filters?: Array<{
    filter: string;
    value: string;
  }>;
  categories?: Array<{
    filter: string;
    value: string;
  }>;
  new_supplier: mongoose.Schema.Types.ObjectId | null;
  display: boolean;
  c_badge?: any;
}

/**
 * ---------------------------
 * Mongoose Schemas
 * ---------------------------
 */

/**
 * Currency Amount Schema
 */
const CurrencyAmountSchema: Schema = new Schema(
  {
    currency: { type: String, required: true },
    amount: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Sell Price Schema
 */
const SellPriceSchema: Schema = new Schema(
  {
    currency: { type: String, default: '' },
    amount: { type: String, default: '' },
    valid_until_date: { type: Date, default: '' },
    date_added: { type: Date },
    date_updated: { type: Date },
  },
  { _id: false }
);

const PromotionPriceSchema: Schema = new Schema(
  {
    currency: { type: String, default: null },
    amount: { type: String, required: true },
    valid_until_date: { type: Date, default: null },
    date_added: { type: Date },
    date_updated: { type: Date },
  },
  { _id: false }
);

/**
 * Buy Price Schema
 */
const BuyPriceSchema: Schema = new Schema(
  {
    currency: { type: String, required: true },
    amount: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Price Schema
 */
const PriceSchema: Schema = new Schema(
  {
    buy: { type: BuyPriceSchema, required: true },
    sell: { type: SellPriceSchema },
    promotion_price: {
      type: PromotionPriceSchema,
      default: () => ({ currency: "", amount: "0", valid_until_date: null, date_added: new Date(), date_updated: new Date() })
    }
  },
  { _id: false }
);

/**
 * Supplier Schema
 */
const SupplierSchema: Schema = new Schema(
  {
    id: { type: Number },
    name: { type: String },
    discount: { type: Number, default: null },
    shipping_cost: { type: Number, default: null },
    shipping_cost_dry_ice: { type: Number, default: null },
    bank_fee: { type: Number, default: null },
    invoice_surcharges: { type: Number, default: null },
    margin: { type: Number },
    flat_rate: { type: Number, default: null },
  },
  { _id: false }
);

/**
 * Shipment Schema
 */
const ShipmentSchema: Schema = new Schema(
  {
    dry_ice: { type: Boolean },
    final_shipping_cost: { type: Number },
  },
  { _id: false }
);

/**
 * Supplier Category Schema
 */
const SupplierCategorySchema: Schema = new Schema(
  {
    id: { type: Number, default: null },
    name: { type: String },
  },
  { _id: false }
);

/**
 * Category Schema
 */
const CategorySchema: Schema = new Schema(
  {
    id: { type: Number, default: null },
    name: { type: String, required: true },
    supplier_category: { type: SupplierCategorySchema },
  },
  { _id: false }
);

/**
 * Review Subdocument Schema
 */
const ReviewSchema: Schema = new Schema(
  {
    client_name: { type: String },
    message: { type: String },
    stars: { type: Number },
    userId: { type: String },
  },
  { _id: false }
);

/**
 * Filter Subdocument Schema
 */
const FilterSubSchema: Schema = new Schema(
  {
    filterId: { type: mongoose.Schema.Types.ObjectId },
    subId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false }
);

const categorySubSchema: Schema = new Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId },
    subId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false }
);

/**
 * Main Gentaur Product Schema
 */
const Gentaur_ProductSchema: Schema = new Schema<IGentaur_Product>(
  {
    id: { type: Number, required: true, unique: true },
    new_id: { type: Number, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: 'single' },
    catalog_number: { type: String, required: true },
    supplier_catalog_number: { type: String },
    sell_price: { type: String },
    supplier: { type: SupplierSchema },
    price: { type: PriceSchema },
    shipment: { type: ShipmentSchema },
    size: { type: String, required: true },
    additional_information: { type: String, default: null },
    description: { type: String, default: null },
    specifications: { type: String, default: null },
    variations: { type: String, default: null },
    storage_and_shipping: { type: String, default: null },
    notes: { type: String, default: null },
    cluster_name: { type: String, default: null },
    featured_image: { type: [String], default: [] },
    images: { type: [String], default: [] },
    date_added: { type: Date },
    date_updated: { type: Date },
    available: { type: Boolean, required: true },
    display: { type: Boolean, required: true },
    sync: { type: Boolean, default: false },
    filters: { type: [FilterSubSchema] },
    categories: { type: [categorySubSchema] },
    new_supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  },
  {
    timestamps: true,
    collection: "gentaur_products",
    strict: false,
  }
);

/**
 * Gentaur Product Model
 */
const Gentaur_Product: Model<IGentaur_Product> = 
  mongoose.models.Gentaur_Product || 
  mongoose.model<IGentaur_Product>("Gentaur_Product", Gentaur_ProductSchema);

export default Gentaur_Product; 