"use server";
import { createResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongoose";
import { Document, Types } from "mongoose";
import Page_Redirection from "@/models/Page_Redirection";

export interface PageRedirection {
  _id: string;
  redirecting_id: string;
  urls_from: {
    url: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  platform: string;
  url_to: string;
  status: boolean;
  type: 'bulk' | 'single';
  createdAt: string;
  updatedAt: string;
}

export interface PageRedirectionsFilters {
  id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function getPageRedirections(filters: PageRedirectionsFilters = {}) {
  try {
    await connectToDatabase();

    const {
      id,
      search = "",
      page = 1,
      limit = 100,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {};
    
    if (id) {
      searchQuery = { _id: id };
    } else if (search) {
      searchQuery = {
        $or: [
          { url_to: { $regex: search, $options: "i" } },
          { "urls_from.url": { $regex: search, $options: "i" } }
        ]
      };
    }

    // Get total count for pagination
    const total = await Page_Redirection.countDocuments(searchQuery)
      .collation({ locale: "en", strength: 2 });

    // Fetch redirections with pagination and sorting
    const redirections = await Page_Redirection.find(searchQuery)
      .collation({ locale: "en", strength: 2 })
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Serialize the data to plain objects
    const serializedRedirections = redirections.map((redirection) => {
      const now = new Date().toISOString();
      return {
        _id: redirection._id.toString(),
        redirecting_id: redirection._id.toString(),
        urls_from: redirection.urls_from.map((url) => ({
          url: url.url,
          active: url.active,
          createdAt: url.createdAt?.toISOString() || now,
          updatedAt: url.updatedAt?.toISOString() || url.createdAt?.toISOString() || now,
        })),
        platform: redirection.platform,
        url_to: redirection.url_to,
        status: redirection.status,
        type: redirection.type,
        createdAt: redirection.createdAt?.toISOString() || now,
        updatedAt: redirection.updatedAt?.toISOString() || now,
      };
    });

    return createResponse(
      true,
      "Page redirections fetched successfully",
      {
        body: {
          data: serializedRedirections,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      }
    );
  } catch (error) {
    return createResponse(false, "Failed to fetch page redirections", { error });
  }
} 





interface CreatePageRedirectionData {
  url_from: string;
  url_to: string;
  platform: "gentaur" | "genprice";
}

interface PageRedirectionDocument extends Document {
  _id: Types.ObjectId;
  urls_from: Array<{
    url: string;
    active: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }>;
  platform: string;
  url_to: string;
  status: boolean;
  type: 'bulk' | 'single';
  createdAt: Date;
  updatedAt?: Date;
}

export async function createPageRedirection(data: CreatePageRedirectionData) {
  try {
    await connectToDatabase();

    const { url_from, url_to, platform } = data;

    if (!url_from || !url_to || !platform) {
      return createResponse(
        false,
        `Missing required fields: url_from: ${url_from}, url_to: ${url_to}, platform: ${platform}`
      );
    }

    // Validate platform
    const validPlatforms = ["gentaur", "genprice"];
    if (!validPlatforms.includes(platform)) {
      return createResponse(false, `Invalid platform: ${platform}.`);
    }

    // Convert url_from to an array
    const urls_from = Array.isArray(url_from) ? url_from : [url_from];

    // Check for URL match
    const urlMatch = urls_from.some((url) => url === url_to);
    if (urlMatch) {
      return createResponse(
        false,
        "Source URL cannot be the same as target URL."
      );
    }

    // Check for conflicting redirections
    const conflictingRedirection = await Page_Redirection.findOne({
      url_to: { $ne: url_to },
      "urls_from.url": { $in: urls_from },
    });

    if (conflictingRedirection) {
      return createResponse(
        false,
        "Multiple redirections with the same url_from can cause problems. Please check again."
      );
    }

    // Check for existing redirection with the same url_to
    const existingRedirection = await Page_Redirection.findOne({ url_to }) as PageRedirectionDocument | null;

    if (existingRedirection) {
      // Check if the url_from is already in the existing redirection's urls_from array
      const existingUrlsFrom = existingRedirection.urls_from.map((link) => link.url);
      const newUrls = urls_from.filter((url) => !existingUrlsFrom.includes(url));

      // Add the new url_from URLs to the existing redirection's urls_from
      existingRedirection.urls_from.push(
        ...newUrls.map((url) => ({
          url,
          active: true,
          createdAt: new Date(),
        }))
      );

      // Save the updated existing redirection
      await existingRedirection.save();
      
      // Serialize the response
      const now = new Date().toISOString();
      const serializedRedirection = {
        _id: existingRedirection._id.toString(),
        redirecting_id: existingRedirection._id.toString(),
        urls_from: existingRedirection.urls_from.map((url) => ({
          url: url.url,
          active: url.active,
          createdAt: url.createdAt?.toISOString() || now,
          updatedAt: url.updatedAt?.toISOString() || url.createdAt?.toISOString() || now,
        })),
        platform: existingRedirection.platform,
        url_to: existingRedirection.url_to,
        status: existingRedirection.status,
        type: existingRedirection.type,
        createdAt: existingRedirection.createdAt?.toISOString() || now,
        updatedAt: existingRedirection.updatedAt?.toISOString() || now,
      };

      return createResponse(
        true,
        "Redirection updated successfully.",
        { body: serializedRedirection }
      );
    }

    // Create new redirection
    const newRedirection = new Page_Redirection({
      urls_from: urls_from.map((url) => ({
        url,
        active: true,
        createdAt: new Date(),
      })),
      url_to,
      type: "single",
      platform,
    }) as PageRedirectionDocument;

    await newRedirection.save();

    // Serialize the response
    const now = new Date().toISOString();
    const serializedRedirection = {
      _id: newRedirection._id.toString(),
      redirecting_id: newRedirection._id.toString(),
      urls_from: newRedirection.urls_from.map((url) => ({
        url: url.url,
        active: url.active,
        createdAt: url.createdAt?.toISOString() || now,
        updatedAt: url.updatedAt?.toISOString() || url.createdAt?.toISOString() || now,
      })),
      platform: newRedirection.platform,
      url_to: newRedirection.url_to,
      status: newRedirection.status,
      type: newRedirection.type,
      createdAt: newRedirection.createdAt?.toISOString() || now,
      updatedAt: newRedirection.updatedAt?.toISOString() || now,
    };

    return createResponse(
      true,
      "Page redirection created successfully.",
      { body: serializedRedirection }
    );
  } catch (error) {
    console.error("Error occurred in createPageRedirection:", error);
    return createResponse(false, "Failed to create page redirection", { error });
  }
} 