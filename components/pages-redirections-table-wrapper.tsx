"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PagesRedirectionsTable } from "./pages-redirections-table";
import { getPageRedirections } from "@/api/page-redirections";

interface PageRedirection {
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

interface PagesRedirectionsTableWrapperProps {
  initialData: PageRedirection[];
  initialPageCount: number;
}

interface PageRedirectionResponse {
  data: PageRedirection[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function PagesRedirectionsTableWrapper({
  initialData,
  initialPageCount,
}: PagesRedirectionsTableWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PageRedirection[]>(initialData);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [isLoading, setIsLoading] = useState(false);

  const currentPage = Number(searchParams.get("page")) || 1;
  const currentSearch = searchParams.get("search") || "";

  const handlePaginationChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  const handleSearchChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        const response = await getPageRedirections({
          page: currentPage,
          search: currentSearch,
        }) as { success: boolean; body: { body: PageRedirectionResponse } };

        if (response.success && isMounted && response.body?.body) {
          setData(response.body.body.data);
          setPageCount(response.body.body.pagination.totalPages);
        }
      } catch (error) {
        console.error("Failed to fetch page redirections:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, currentSearch, isLoading]);

  return (
    <PagesRedirectionsTable
      data={data}
      pageCount={pageCount}
      currentPage={currentPage}
      onPaginationChange={handlePaginationChange}
      onSearchChange={handleSearchChange}
    />
  );
} 