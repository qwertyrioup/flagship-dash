import mongoose, { Document, Schema } from 'mongoose';
import { IRole } from './Role';



// Define the User interface
export interface IUser extends Document {
  firstname: string;
  lastname: string;
  email: string;
  password?: string; // For input, will not be saved directly if select: false and cleared by pre-save hook
  password_hash: string; // For storing the hashed password
  photoURL?: string;
  role?: IRole['_id']; // Reference to the 'Role' collection, optional as per schema
  displayName?: string;
  phoneNumber?: string;
  country?: string;
  address?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  about?: string;
  isPublic?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the UserSchema
const UserSchema: Schema<IUser> = new Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Not selected by default
    photoURL: { type: String },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: false, // Kept as false as per your schema
    },
    displayName: { type: String },
    phoneNumber: { type: String },
    country: { type: String },
    address: { type: String },
    state: { type: String },
    city: { type: String },
    zipCode: { type: String },
    about: { type: String },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);



const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 