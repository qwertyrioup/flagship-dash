import mongoose, { Document, Model, Schema } from "mongoose";

// Define the interface for the blueprint document
interface IBluePrint extends Document {
  name: string;
  files: string[]; // Array of strings for additional fields
}

// Define the schema
const BluePrintSchema: Schema = new Schema<IBluePrint>(
  {
    name: { type: String, unique: true, required: true }, // Name of the blueprint
    files: {
      type: [{ type: String }],
      default: [], // Default to an empty array
      validate: {
        validator: function (files: string[]) {
          // Ensure no duplicate or undefined values
          const uniqueFiles = new Set(files.filter((file) => file && file.trim() !== ""));
          return uniqueFiles.size === files.length;
        },
        message: "The files array contains duplicates or invalid entries.",
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
    collection: "blue_prints", // Specify the collection name
  }
);

// Pre-save hook to sanitize the files array
BluePrintSchema.pre("save", function (next) {
  if (this.isModified("files") && Array.isArray(this.files)) {
    this.files = this.files
      .filter((file) => file && file.trim() !== "") // Remove empty or undefined values
      .map((file) => file.trim()); // Trim whitespace
  }
  next();
});

// Define the model
const BluePrint: Model<IBluePrint> = 
  mongoose.models.BluePrint || 
  mongoose.model<IBluePrint>("BluePrint", BluePrintSchema);

export default BluePrint; 