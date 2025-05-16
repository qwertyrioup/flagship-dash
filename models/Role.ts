import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the Role interface
export interface IRole extends Document {
  name: string; // Role name (e.g., "admin", "client", "blogger")
  permissions: mongoose.Types.ObjectId[]; // Array of references to the 'Permission' collection
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the RoleSchema
const RoleSchema: Schema<IRole> = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission', // Reference to the Permission collection
      },
    ],
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create and export the Role model, ensuring it's not recompiled
const Role = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role; 