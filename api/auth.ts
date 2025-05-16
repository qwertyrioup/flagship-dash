"use server";

import { ApiResponse, errorResponse, successResponse, createResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Import User type from AuthContext
import { JWT_SEC } from "@/lib/consts";
import type { User as UserType } from "@/store/AuthContext";
import User from "@/models/User";
import Role from "@/models/Role";
import Permission from "@/models/Permission";

// Ensure models are registered
const models = {
  User,
  Role,
  Permission
};



interface LoginResponse {
  token: string;
  user: Omit<UserType, 'password'>;
}


/**
 * Server action for user login
 */
export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  try {
    await connectToDatabase();

    // Check if both email and password are provided
    if (!email || !password) {
      return createResponse<LoginResponse>(false, "Email and password are required.");
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find the user by email and populate role and permissions
    const user = await User.findOne({ email: normalizedEmail })
      .populate({
        path: "role",
        model: "Role",
        populate: {
          path: "permissions",
          model: "Permission"
        }
      });

    if (!user) {
      return createResponse<LoginResponse>(false, "User not found.");
    }



    // Compare the password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password || ""
    );
    
    if (!isPasswordValid) {
      return createResponse<LoginResponse>(false, "Invalid email or password.");
    }

    // Ensure JWT_SECRET is available
    const JWT_SECRET = JWT_SEC;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set.");
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "365d" } // Token valid for 365 days
    );

    // Convert Mongoose document to plain object
    const { password: _, ...userData } = user.toObject();
    
    // Serialize and deserialize to ensure we have a plain JavaScript object without any Mongoose methods
    const serializedUser = JSON.parse(JSON.stringify(userData));
    
    return successResponse("Login successful.", {
      token,
      user: serializedUser
    });
  } catch (error) {
    console.error("Login error:", error);
    return createResponse<LoginResponse>(false, "Login failed. Please try again.");
  }
}

/**
 * Server action to resend verification email
 */

/**
 * Server action to validate token and fetch user data
 */
export async function validateTokenAndGetUser(token: string): Promise<ApiResponse<{ user: UserType }>> {
  try {
    await connectToDatabase();

    // Verify JWT token
    const JWT_SECRET = JWT_SEC;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set.");
    }

    const decoded = (jwt as any).verify(token, JWT_SECRET) as { userId: string };
    
    // Find the user and populate role and permissions
    const user = await User.findById(decoded.userId)
      .populate({
        path: "role",
        model: "Role",
        populate: {
          path: "permissions",
          model: "Permission"
        }
      });

    if (!user) {
      return createResponse<{ user: UserType }>(false, "User not found");
    }

    // Convert to plain object and remove sensitive data
    const { password: _, ...userData } = user.toObject();
    const serializedUser = JSON.parse(JSON.stringify(userData));

    return successResponse("Token valid", { user: serializedUser as UserType });
  } catch (error) {
    console.error("Token validation error:", error);
    return createResponse<{ user: UserType }>(false, "Invalid token");
  }
}

/**
 * Server action to handle authentication check and redirect
 */
export async function checkAuth(pathname: string = '/') {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    if (pathname !== '/') {
      redirect('/');
    }
    return null;
  }

  const response = await validateTokenAndGetUser(token);
  
  if (!response.success) {
    // Clear cookies on invalid token
    await cookieStore.delete('auth_token');
    if (pathname !== '/') {
      redirect('/');
    }
    return null;
  }

  // If authenticated and trying to access root, redirect to dashboard
  if (pathname === '/') {
    redirect('/dashboard');
  }

  return response.body?.user;
}

/**
 * Server action to get the current authenticated user
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    // Verify JWT token
    const JWT_SECRET = JWT_SEC;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set.");
    }

    const decoded = (jwt as any).verify(token, JWT_SECRET) as { userId: string };
    
    // Ensure database connection is established
    await connectToDatabase();
    
    // Find the user and populate role and permissions
    const user = await User.findById(decoded.userId)
      .populate({
        path: "role",
        model: "Role",
        populate: {
          path: "permissions",
          model: "Permission"
        }
      });

    if (!user) {
      return null;
    }

    // Convert to plain object and remove sensitive data
    const { password: _, ...userData } = user.toObject();
    const serializedUser = JSON.parse(JSON.stringify(userData));
    
    return serializedUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}



