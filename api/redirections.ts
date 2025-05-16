import { createResponse } from "@/lib/api-response";
import New_Redirection from "@/models/New_Redirection";
import { connectToDatabase } from "@/lib/mongoose";
import { FilterQuery } from "mongoose";

export interface Redirection {
  _id: string;
  product_id: number;
  platform: {
    gentaur: { old_url: string; createdAt: string }[];
    genprice: { old_url: string; createdAt: string }[];
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RedirectionsFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

type SearchQuery = {
  product_id?: number;
  $or?: Array<{
    "platform.gentaur.old_url"?: string;
    "platform.genprice.old_url"?: string;
  }>;
};


export async function getRedirections(filters: RedirectionsFilters = {}) {
  try {
    await connectToDatabase();

    let noSearch = true
    const {
      page = 1,
      limit = 100,
      search
    } = filters;

    if (search) {
      noSearch = false
    }
    


    const totalDocs = await New_Redirection.estimatedDocumentCount()
    // Calculate the effective skip within the 10k limit
    const effectiveSkip = Math.min((page - 1) * limit, totalDocs - limit);
    
    // Fixed total count at 10k
    const total = totalDocs;

    let redirections
    

    if (noSearch) {
      // Single query with the correct skip value
      redirections = await New_Redirection.find()
        .sort({ createdAt: -1 })
        .skip(effectiveSkip)
        .limit(limit)
        .lean();
    } else {
      if (isNaN(Number(search))) {
        redirections = await New_Redirection.find({
          $or: [
            { "platform.gentaur.old_url": search },
            { "platform.genprice.old_url": search },
          ]
        }).collation({ locale: "en", strength: 2 })
        
       
      } else {
        redirections = await New_Redirection.find({
          product_id: Number(search)
        })
      }
    }
      
    // Serialize the data as before
    const serializedRedirections = (redirections as unknown as Array<{
      _id: { toString: () => string };
      product_id: number;
      platform: {
        gentaur: Array<{ old_url: string; createdAt: Date }>;
        genprice: Array<{ old_url: string; createdAt: Date }>;
      };
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>).map((redirection) => ({
      _id: redirection._id.toString(),
      product_id: redirection.product_id,
      platform: {
        gentaur: redirection.platform.gentaur.map((item) => ({
          old_url: item.old_url,
          createdAt: item.createdAt.toISOString(),
        })),
        genprice: redirection.platform.genprice.map((item) => ({
          old_url: item.old_url,
          createdAt: item.createdAt.toISOString(),
        })),
      },
      active: redirection.active,
      createdAt: redirection.createdAt.toISOString(),
      updatedAt: redirection.updatedAt.toISOString(),
    }));

    // Calculate actual total pages based on 10k limit
    const totalPages = Math.min(Math.ceil(total / limit), Math.ceil(totalDocs / limit));

    return createResponse(
      true,
      "Redirections fetched successfully",
      {
        body: {
          data: serializedRedirections,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      }
    );
  } catch (error) {
    console.error('Error in getRedirections:', error);
    return createResponse(false, "Failed to fetch redirections", { error });
  }
}