import mongoose, { Schema, Document, Model } from "mongoose";

// ----------------------------------------------------------------------

// Interface for Link Redirected
interface ILinkRedirected {
    url: string;
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// Schema for Link Redirected
const LinkRedirectedSchema = new Schema<ILinkRedirected>(
    {
        url: {
            type: String,
            required: true,
        },
        active: {
            type: Boolean,
            default: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false } // Prevents the creation of an _id field for subdocuments
);

// ----------------------------------------------------------------------

// Interface for Page Redirection
interface IPage_Redirection extends Document {
    urls_from: ILinkRedirected[];
    platform: string;
    url_to: string;
    status: boolean;
    type: 'bulk' | 'single';
    createdAt?: Date;
    updatedAt?: Date;
}

// Schema for Page Redirection
const Page_RedirectionSchema = new Schema<IPage_Redirection>(
    {
        platform: {
            type: String,
            required: true,
            enum: ['gentaur', 'genprice'],
        },
        urls_from: {
            type: [LinkRedirectedSchema], // Embeds an array of LinkRedirectedSchema
            required: true,
        },
        url_to: {
            type: String,
            required: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['bulk', 'single'],
            default: 'single',
        },
    },
    { timestamps: true } // Automatically manages createdAt and updatedAt fields
);

// ----------------------------------------------------------------------

// Prevent model recompilation in development with hot reloading
const Page_Redirection: Model<IPage_Redirection> = 
  mongoose.models.Page_Redirection || 
  mongoose.model<IPage_Redirection>("Page_Redirection", Page_RedirectionSchema);

export default Page_Redirection; 