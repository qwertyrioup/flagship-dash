"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Redirection {
  _id: string;
  product_id: number;
  platform: {
    gentaur: { old_url: string; createdAt: Date }[];
    genprice: { old_url: string; createdAt: Date }[];
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const columns: ColumnDef<Redirection>[] = [
  {
    accessorKey: "product_id",
    header: "Product ID",
    cell: ({ row }) => {
      return (
        <Link 
          href={`/dashboard/redirections/products/${row.original.product_id}`}
          className="hover:underline"
        >
          {row.original.product_id}
        </Link>
      );
    },
  },
  {
    accessorKey: "platform.gentaur",
    header: "Gentaur URL",
    cell: ({ row }) => {
      const urls = row.original.platform.gentaur;
      // Sort by createdAt and get the most recent URL
      const latestUrl = [...urls].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return (
        <div className="text-sm">
          {latestUrl ? (
            latestUrl.old_url.length > 50 
              ? `${latestUrl.old_url.slice(0, 50)}...` 
              : latestUrl.old_url
          ) : (
            <span className="text-muted-foreground">No URL</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "platform.genprice",
    header: "Genprice URL",
    cell: ({ row }) => {
      const urls = row.original.platform.genprice;
      // Sort by createdAt and get the most recent URL
      const latestUrl = [...urls].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return (
        <div className="text-sm">
          {latestUrl ? (
            latestUrl.old_url.length > 50 
              ? `${latestUrl.old_url.slice(0, 50)}...` 
              : latestUrl.old_url
          ) : (
            <span className="text-muted-foreground">No URL</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.original.active;
      return (
        <Badge variant={active ? "default" : "destructive"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      return format(new Date(row.original.createdAt), "PPp");
    },
  },
];

interface DataTableProps {
  data: Redirection[];
  pageCount: number;
  currentPage: number;
  onPaginationChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  search?: string;
}

export function RedirectionsTable({
  data,
  pageCount,
  currentPage,
  onPaginationChange,
  onSearchChange,
  search = "",
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

 

  const handleSearchChange = (value: string) => {
    
    setSearchValue(value);
    setTimeout(() => {
      onSearchChange(value);
    }, 300);
    
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    pageCount,
    manualPagination: true,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Input
          placeholder="Search by product ID or URL..."
          value={searchValue}          onChange={(event) => handleSearchChange(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange(currentPage + 1)}
            disabled={currentPage >= pageCount}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
