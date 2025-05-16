"use client";

import {
  IconArrowElbowRight,
  IconBuildingStore,
  IconLayoutDashboardFilled,
  IconPoint,
  IconPointFilled, IconUsers
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { User } from "@/store/AuthContext";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userData: User;
}

const menuItems = [
  {
    title: "Redirections",
    icon: IconArrowElbowRight,
    href: "/dashboard/redirections",
    subItems: [
      {
        title: "Products",
        icon: IconPointFilled,
        href: "/dashboard/redirections/products",
      },
      {
        title: "Pages",
        icon: IconPointFilled,
        href: "/dashboard/redirections/pages",
      }
    ],
  },
  {
    title: "Products",
    icon: IconBuildingStore,
    href: "/dashboard/products",
    subItems: [
      {
        title: "List",
        icon: IconPointFilled,
        href: "/dashboard/products/list",
      },
      // {
      //   title: "Auto Checker Supplier Catalog Number",
      //   icon: IconPointFilled,
      //   href: "/dashboard/products/auto-checker-supplier-catalog-number",
      // },
      {
        title: "Auto Checker Catalog Number",
        icon: IconPointFilled,
        href: "/dashboard/products/auto-checker-catalog-number",
      },
      // {
      //   title: "Auto Generator",
      //   icon: IconPointFilled,
      //   href: "/dashboard/products/auto-generator",
      // },
      
      
    ],
  },
  {
    title: "Orders",
    icon: IconUsers,
    href: "/dashboard/orders",
    subItems: [
      {
        title: "List",
        icon: IconPointFilled,
        href: "/dashboard/orders/list",
      },
    ],
  },
];

export function AppSidebar({ userData, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconLayoutDashboardFilled className="!size-5" />
                <span className="text-base font-semibold">
                  Gentaur Dashboard
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            if (item.subItems) {
              return (
                <SidebarMenuSub key={item.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuSubButton>
                  {item.subItems.map((subItem) => {
                    const isSubItemActive = pathname === subItem.href;
                    return (
                      <SidebarMenuSubItem key={subItem.href}>
                        <Link 
                          href={subItem.href}
                          className={`flex items-start gap-2 text-sm pl-6 ${isSubItemActive ? "text-primary" : ""}`}
                        >
                          {isSubItemActive ? (
                            <IconPointFilled className="size-3 mt-1.5" />
                          ) : (
                            <IconPoint className="size-3 mt-1.5" />
                          )}
                          {subItem.title}
                        </Link>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              );
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                >
                  <Link href={item.href}>
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: `${userData.firstname} ${userData.lastname}`,
          email: userData.email,
          avatar: "" // You might want to add an avatar field to your User type
        }} />
      </SidebarFooter>
    </Sidebar>
  );
}
