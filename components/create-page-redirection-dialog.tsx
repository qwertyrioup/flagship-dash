"use client";

import { createPageRedirection } from "@/api/page-redirections";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CreatePageRedirectionDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    platform: "" as "gentaur" | "genprice",
    url_from: "",
    url_to: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await createPageRedirection(formData);
      

      if (response.success) {
        toast.success("Success", {
          description: response.message,
        });
        setOpen(false);
        window.location.reload();
      } else {
        toast.error("Error", {
          description: response.message,
        });
      }
    } catch (error) {
        console.log(error)
      toast.error("Error", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Redirection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Page Redirection</DialogTitle>
          <DialogDescription>
            Create a new page redirection by selecting the platform and providing the URLs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value: "gentaur" | "genprice") =>
                  setFormData((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gentaur">Gentaur</SelectItem>
                  <SelectItem value="genprice">Genprice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url_from">Source URL</Label>
              <Input
                id="url_from"
                placeholder="/source-url"
                value={formData.url_from}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url_from: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url_to">Target URL</Label>
              <Input
                id="url_to"
                placeholder="/target-url"
                value={formData.url_to}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url_to: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 