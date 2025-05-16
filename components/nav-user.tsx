"use client"

import * as React from "react";
import { IconLogout } from "@tabler/icons-react";
import { useAuth } from "@/store/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

export function NavUser({ user }: NavUserProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-muted">
                  {user.avatar ? (
                    <Image
                      src={user.avatar || "/default-avatar.png"}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
