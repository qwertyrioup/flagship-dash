"use client";

import { loginUser } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { User } from "@/store/AuthContext";
import { useAuth } from "@/store/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const { email, password } = Object.fromEntries(
      new FormData(e.currentTarget as HTMLFormElement)
    );

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Logging in...");

    try {
      // Use the server action instead of client API call
      const response = await loginUser(email as string, password as string);
      console.log(response)

      // Check if response contains an error
      if (!response.success) {
        // Always dismiss the loading toast first
        toast.dismiss(loadingToast);
        return;
      }

      // Save to auth context
      const success = await login({
        token: response.body!.token,
        user: response.body!.user as User,
      });

      if (!success) {
        toast.dismiss(loadingToast);
        toast.error("Failed to save login state");
        return;
      }

      // Dismiss loading toast before showing success
      toast.dismiss(loadingToast);
      toast.success("Login successful! Redirecting...");

      // Wait a bit before redirecting
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.dismiss(loadingToast);

      // Handle different error formats
      let errorMessage = "Login failed. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast.error(errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <form
      onSubmit={submitForm}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-primaryBlue">
          Login to your account
        </h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email below to login to your account
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            {/* <Link
              href="/reset-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link> */}
          </div>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button
        variant="default"
          type="submit"
          className="w-full bg-primary text-white dark:text-black "
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </div>
      
    </form>
  );
}
