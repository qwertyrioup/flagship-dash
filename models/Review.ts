import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  name: string;
  role: string;
  rating: number;
  comment: string;
  product_id: number;
  avatar: string;
  initials: string;
  date: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReviewSchema: Schema<IReview> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    product_id: {
      type: Number,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    initials: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Use a consistent model name
const Review: Model<IReview> = 
  mongoose.models.Review || 
  mongoose.model<IReview>('Review', ReviewSchema);

export default Review; 