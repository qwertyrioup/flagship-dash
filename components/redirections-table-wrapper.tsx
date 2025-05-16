"use client";

import { Redirection as ApiRedirection } from "@/api/redirections";
import { RedirectionsTable } from "@/components/redirections-table";
import { useRouter, useSearchParams } from "next/navigation";

interface RedirectionsTableWrapperProps {
  data: ApiRedirection[];
  pageCount: number;
  currentPage: number;
}

export function RedirectionsTableWrapper({
  data,
  pageCount,
}: RedirectionsTableWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageFromUrl = Number(searchParams.get("page")) || 1;
  const searchFromUrl = searchParams.get("search") || "";

  const handlePaginationChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (search: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to first page on search
    router.push(`?${params.toString()}`);
  };

  // Convert string dates to Date objects
  const convertedData = data.map(item => ({
    ...item,
    platform: {
      gentaur: item.platform.gentaur.map(url => ({
        ...url,
        createdAt: new Date(url.createdAt)
      })),
      genprice: item.platform.genprice.map(url => ({
        ...url,
        createdAt: new Date(url.createdAt)
      }))
    },
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt)
  }));

  return (
    <RedirectionsTable
      data={convertedData}
      pageCount={pageCount}
      currentPage={pageFromUrl}
      onPaginationChange={handlePaginationChange}
      onSearchChange={handleSearchChange}
      search={searchFromUrl}
    />
  );
} 