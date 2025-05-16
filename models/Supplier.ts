import mongoose, { Schema, Document, Model, model, Types } from "mongoose";

/**
 * Supplier Company Interface
 */
interface SupplierCompany {
  name: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
}

/**
 * Supplier Interface
 */
export interface ISupplier extends Document {
  id: number;
  newId: string;
  name: string;
  newName: string;
  website: string;
  company: SupplierCompany;
  discount: number;
  shipping_cost: number;
  shipping_cost_azardous: number;
  shipping_cost_dry_ice: number;
  orderingOffice: string;
  availibility: string;
  contact: string;
  backlink:string;
  web_page: string;
  ordering_method: string;
  validation: string;
  product_count: number;
  bank_fee: number;
  invoice_surcharges: number;
  margin: number;
  flat_rate: number;
  links: string[];
  featured_image: string[];
  images: string[];
  notes: string;
  assignedUsers: Types.ObjectId[];
  lastUpdateBy: Types.ObjectId;
  description?: string;
  isLocked?: boolean;
  supplier_overview?: boolean;
  supplier_details?: boolean;
  price_formula?: boolean;
  price_list?: boolean;
  upload: "Action Required" | "In Progress" | "Completed";
  date: "2024" | "2025" | "Older" | "None" | "";
  status: "Active" | "Warning" | "Inactive" | "";
  type: "Supplier" | "Distributor";
  buy_prices: "price_list" | "website" | "";
  sell_prices: "show" | "hide" | "";
  featured: "Top" | "Mid" | "Flop" | " ";
  dry_ice_products: "Many" | "Some" | "None" | "";
  hazardous_products: "Many" | "Some" | "None";
  uploaded_price: "None" | "List Price" | "Discounted Price" | "";
  visibility: "Public" | "Customers" | "Internal";
  variations: "TRUE" | "FALSE" | "Not Checked";
  discount_value: "Yes" | "No";
  email: string; // New field for multiple emails
  orders: number; // New field for orders
  MOQ: number; // New field for orders
  territories: string[]; // New field for territories
  forbidden_territories: string[]; // New field for territories
}


/**
 * Supplier Company Schema
 */
const SupplierCompanySchema: Schema = new Schema(
  {
    name: { type: String, default: "" },
    address1: { type: String, default: "" },
    address2: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * Supplier Schema
 */
const SupplierSchema: Schema = new Schema<ISupplier>(
  {
    id: { type: Number, required: true, unique: true },
    newId: { type: String, required: false, unique: true },
    name: { type: String, required: true },
    newName: { type: String, default: "" },
    website: { type: String, default: "" },
    backlink: { type: String, default: "" },
    company: { type: SupplierCompanySchema, required: true },
    discount: { type: Number, default: 0 },
    shipping_cost: { type: Number, default: 0 },
    shipping_cost_azardous: { type: Number, default: 0 },
    shipping_cost_dry_ice: { type: Number, default: 0 },
    bank_fee: { type: Number, default: 0 },
    invoice_surcharges: { type: Number, default: 0 },
    margin: { type: Number, required: true },
    flat_rate: { type: Number, default: 0 },
    links: { type: [String], default: [] },
    featured_image: [
      {
        id: { type: Schema.Types.Mixed, default: null },
        file_id: { type: Schema.Types.Mixed, default: null },
        src: { type: String, required: true },
        alt: { type: String, default: null },
        source_path: { type: String, default: "" },
      },
    ],
    images: [
      {
        logo: { type: String, required: true },
      },
    ],
    notes: { type: String, default: "" },
    assignedUsers: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    lastUpdateBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    description: { type: String, default: "" },
    isLocked: { type: Boolean, default: false },
    supplier_overview: { type: Boolean, default: false },
    supplier_details: { type: Boolean, default: false },
    price_formula: { type: Boolean, default: false },
    price_list: { type: Boolean, default: false },
    upload: {
      type: String,
      enum: ["Action Required", "In Progress", "Completed"],
      default: "Action Required",
    },
    date: {
      type: String,
      enum: ["2024", "2025", "Older", "None",""],
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Warning", "Inactive", ""],
      default: "",
    },
    dry_ice_products: {
      type: String,
      enum: ["Many", "Some", "None", ""],
      default: "",
    },
    hazardous_products: {
      type: String,
      enum: ["Many", "Some", "None"],
      default: "None",
    },
    orderingOffice: {
      type: String,
      enum: ["Gentaur Molecular Products", "Genprice Inc", "Gentaur BV","Gentaur GmbH" ,"Gentaur Ltd", "Gentaur SARL", "Gentaur SRL", "Gentaur Sp. z o.o.", "Gentaur Bulgaria EOOD", ""],
      default: "",
    },
    availibility: {
      type: String,
      enum: ["Quotation" , "Price List" , "Website Price" , "Scrapped Data", ""],
      default: "",
    },
    contact: {
      type: String,
      enum: ["Allowed","Forbidden", ""],
      default: "",
    },
    web_page: {
      type: String,
      enum: ["Yes", "No", ""],
      default: "",
    },
    product_count: {
      type: Number,
      default: 0,
    },
    validation: {
      type: String,
      enum: ["Valid", "Not Valid", ""],
      default: "",
    },
    ordering_method: {
      type: String,
      enum: ["Online", "PO", ""],
      default: "",
    },
    type: {
      type: String,
      enum: ["Supplier", "Distributor"],
      default: "Supplier",
    },
    buy_prices: {
      type: String,
      enum: ["price_list", "website", ""],
      default: "",
    },
    sell_prices: {
      type: String,
      enum: ["show", "hide", ""],
      default: "",
    },
    featured: {
      type: String,
      enum: ["Top", "Mid", "Flop", " "],
      default: " ",
    },
    visibility: {
      type: String,
      enum: ["Public", "Customers", "Internal"],
      default: "Public",
    },
    uploaded_price: {
      type: String,
      enum: ["None", "List Price", "Discounted Price", ""],
      default: "",
    },
    variations: {
      type: String,
      enum: ["TRUE", "FALSE", "Not Checked"],
      default: "Not Checked",
    },
    discount_value: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    email: {
      type: String, // Store emails as a single string separated by ';'
      default: "",
    },
    MOQ: {
      type: Number, // Integer value for the orders field
      default: 0,
    },
    orders: {
      type: Number, // Integer value for the orders field
      default: 0,
      min: [0, "Orders cannot be negative"],
    },
    forbidden_territories:{
      type: [String],
      default: [],
    },
    territories: {
      type: [String], // Array of strings for cumulative attributes
      enum: [
        "USA",
        "EU",
        "UK",
        "Germany",
        "France",
        "Italy",
        "Spain",
        "Austria",
        "Belgium",
        "Bulgaria",
        "Croatia",
        "Cyprus",
        "Czech Republic",
        "Denmark",
        "Estonia",
        "Finland",
        "Greece",
        "Hungary",
        "Ireland",
        "Latvia",
        "Lithuania",
        "Luxembourg",
        "Malta",
        "Netherlands",
        "Poland",
        "Portugal",
        "Romania",
        "Slovakia",
        "Slovenia",
        "Sweden",
        "Other"
      ],
      default: [],
    },
  },
  { timestamps: true }
);

/**
     * Supplier Model
 */
const Supplier: Model<ISupplier> = 
  mongoose.models.Supplier || 
  model<ISupplier>("Supplier", SupplierSchema);

export default Supplier; 