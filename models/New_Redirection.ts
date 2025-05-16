import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for the Redirection document
interface IRedirection extends Document {
  product_id: number;
  platform: {
    gentaur: { old_url: string; createdAt: Date }[];
    genprice: { old_url: string; createdAt: Date }[];
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the redirection
const redirectionSchema = new Schema<IRedirection>(
  {
    product_id: {
      type: Number,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    platform: {
      gentaur: [
        {
          old_url: {
            type: String,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      genprice: [
        {
          old_url: {
            type: String,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

/**
 * This is an Edge-compatible model registration pattern
 * It ensures the model is only registered once and works in Edge runtime
 */
const New_Redirection: Model<IRedirection> = 
  mongoose.models.New_Redirection || 
  mongoose.model<IRedirection>('New_Redirection', redirectionSchema);

export default New_Redirection;