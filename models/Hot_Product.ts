import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHotProduct extends Document {
  productId: mongoose.Types.ObjectId; // Reference to GentaurProduct
  dateAdded: Date; // Track when it was marked as hot
}

const HotProductSchema: Schema = new Schema<IHotProduct>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gentaur_Product', required: true },
    dateAdded: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Use a consistent model name
const HotProduct: Model<IHotProduct> = 
  mongoose.models.Gentaur_Hot_Product || 
  mongoose.model<IHotProduct>('Gentaur_Hot_Product', HotProductSchema);

export default HotProduct; 