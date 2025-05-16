import { NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongoose";

type SupplierOption = {
  id: number;
  name: string;
}

export async function getSuppliers(): Promise<SupplierOption[]> {
  try {
    await connectToDatabase();
    
    const suppliers = await Supplier.find().select("id name")
      .sort({ name: 1 })
      .lean();

    return suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name
    }));
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
}
