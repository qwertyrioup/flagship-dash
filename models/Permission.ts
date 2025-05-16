import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the Permission interface
export interface IPermission extends Document {
  resource: string; // e.g., "products", "blogs"
  actions: { read: boolean; write: boolean; edit: boolean; delete: boolean }; // Actions grouped by resource
  description: string; // Description of the resource
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the PermissionSchema
const PermissionSchema: Schema = new Schema(
  {
    resource: { type: String, required: true, unique: true }, // Unique resource name
    actions: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

// Create the Permission model, ensuring it's not recompiled
const Permission = mongoose.models.Permission || mongoose.model<IPermission>('Permission', PermissionSchema);

export default Permission; 