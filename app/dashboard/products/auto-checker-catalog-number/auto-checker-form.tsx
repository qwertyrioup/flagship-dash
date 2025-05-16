'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useCallback, useEffect } from 'react';
import { toast } from "sonner";
import { TerminalDialog } from "./terminal-dialog";

type Supplier = {
  id: number;
  name: string;
}

interface AutoCheckerFormProps {
  suppliers: Supplier[];
}

export function AutoCheckerForm({ suppliers }: AutoCheckerFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stream, setStream] = useState<ReadableStream | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessComplete, setIsProcessComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  // Reset states when dialog is closed
  useEffect(() => {
    if (!isDialogOpen) {
      setStream(null);
      setIsProcessComplete(false);
      setHasError(false);
      setIsButtonDisabled(false);
    }
  }, [isDialogOpen]);

  // Update button state when file or supplier changes
  useEffect(() => {
    setIsButtonDisabled(!selectedFile || !selectedSupplier || isUploading);
  }, [selectedFile, selectedSupplier, isUploading]);

  const validateForm = useCallback(() => {
    if (!selectedFile) {
      toast.error("Please select an Excel file");
      return false;
    }
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return false;
    }
    return true;
  }, [selectedFile, selectedSupplier]);

  const uploadFile = useCallback(async (file: File, supplierId: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("supplierId", supplierId);

    const response = await fetch("/api/auto-checker-catalog-number", {
      method: "POST",
      body: form,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to upload file");
    }

    return result.tempFilePath;
  }, []);

  const establishStream = useCallback(async (supplierId: string, filePath: string) => {
    const streamResponse = await fetch(
      `/api/auto-checker-catalog-number?supplierId=${supplierId}&filePath=${encodeURIComponent(filePath)}`,
      { method: "GET" }
    );

    if (!streamResponse.ok) {
      throw new Error("Failed to establish stream connection");
    }

    if (!streamResponse.body) {
      throw new Error("No response stream available");
    }

    return streamResponse.body;
  }, []);

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsDialogOpen(true);
    setIsUploading(true);
    setHasError(false);
    setIsProcessComplete(false);
    setIsButtonDisabled(true);

    try {
      const tempFilePath = await uploadFile(selectedFile!, selectedSupplier);
      const streamResponse = await establishStream(selectedSupplier, tempFilePath);
      
      setStream(streamResponse);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "An error occurred");
      setHasError(true);
      setIsDialogOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please select a valid Excel file (.xlsx or .xls)");
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleDialogOpenChange = (open: boolean) => {
    // Only allow closing if process is complete or there's an error
    if (!open && !isProcessComplete && !hasError) {
      toast.error("Please wait for the process to complete");
      return;
    }
    setIsDialogOpen(open);
  };

  const handleStreamComplete = useCallback(() => {
    setIsProcessComplete(true);
    setIsUploading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="excel-file">Excel File</Label>
        <Input
          id="excel-file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger id="supplier" className="w-full">
            <SelectValue placeholder="Select supplier..." />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full"
        disabled={isButtonDisabled}
      >
        {isUploading ? "Uploading..." : "Start Process"}
      </Button>

      <TerminalDialog
        isOpen={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        stream={stream || undefined}
        onStreamComplete={handleStreamComplete}
      />
    </div>
  );
} 