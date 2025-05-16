import mongoose, { Document, Model, Schema } from "mongoose";

interface IProccess extends Document {
  name: string;
  status: "on" | "off";
  supplierId?: number;
}

const ProccessSchema: Schema<IProccess> = new Schema<IProccess>(
  {
    name: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ["on", "off"],
      default: "off", 
    },
    supplierId: { type: Number },
  },
  {
    timestamps: true,
    collection: "proccess",
  }
);

const Proccess: Model<IProccess> = 
  mongoose.models.Proccess || 
  mongoose.model<IProccess>("Proccess", ProccessSchema);

export default Proccess; 