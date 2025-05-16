import mongoose, { Document, Model, Schema } from "mongoose";

// Define the interface for individual properties
interface Property {
  _id?: string;
  name: string;
}

// Define the interface for constant values
interface ConstantValue {
  _id?: string;
  name: string;
  properties: Property[];
}

// Define the interface for additional fields
interface AdditionalField {
  name: string;
  label: string;
  type: "constant" | "variable";
  value: string | ConstantValue[];
  web_page: boolean;
  order: number;
}

// Define the main schema document interface
interface IGentaurProductExtension extends Document {
  name: string;
  fields: AdditionalField[];
}

// Define the schema for individual properties
const PropertySchema: Schema = new Schema<Property>({
  name: { type: String, required: true },
});

// Define the schema for constant values
const ConstantValueSchema: Schema = new Schema<ConstantValue>({
  name: { type: String, required: true },
  properties: { 
    type: [PropertySchema], 
    default: [],
    required: true,
  },
});

// Define the schema for individual fields
const AdditionalFieldSchema: Schema = new Schema<AdditionalField>({
  name: { type: String, required: true },
  label: { type: String},
  type: { type: String, enum: ["constant", "variable"], required: true },
  value: {
    type: [ConstantValueSchema],
    required: true,
    validate: {
      validator: function (v: any) {
        if (this.type === "constant" || this.type === "variable") {
          return (
            Array.isArray(v) &&
            v.every(
              (item) =>
                typeof item.name === "string" &&
                Array.isArray(item.properties) &&
                item.properties.every((prop: Property) => typeof prop.name === "string")
            )
          );
        }
        return false;
      },
      message: ((props: any) =>
        `Invalid value for type '${(this as any).type}'. Value must be an array of objects with 'name' and an array of properties.`),
    },
  },
  web_page: { type: Boolean, default: true },
  order: { type: Number},
});

// Define the main schema
const GentaurProductExtensionSchema: Schema = new Schema<IGentaurProductExtension>(
  {
    name: { type: String, unique: true, required: true },
    fields: {
      type: [AdditionalFieldSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "gentaur_product_extensions",
  }
);

// Define the model
const GentaurProductExtension: Model<IGentaurProductExtension> = 
  mongoose.models.Gentaur_Product_Extension || 
  mongoose.model<IGentaurProductExtension>(
    "Gentaur_Product_Extension",
    GentaurProductExtensionSchema
  );

export default GentaurProductExtension; 

