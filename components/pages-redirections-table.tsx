"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  Row,
  HeaderGroup,
  Header,
  Cell,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PageRedirection {
  _id: string;
  redirecting_id: string;
  platform: string;
  urls_from: Array<{
    url: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  url_to: string;
  type: 'bulk' | 'single';
  createdAt: string;
  updatedAt: string;
}

const columns: ColumnDef<PageRedirection>[] = [
  {
    accessorKey: "redirecting_id",
    header: "ID",
    cell: ({ row }: { row: Row<PageRedirection> }) => {
      return (
        <Link href={`/dashboard/redirections/pages/${row.original._id}`}>
          <Button variant="link" className="p-0 h-auto">
            {row.original.redirecting_id}
          </Button>
        </Link>
      );
    },
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }: { row: Row<PageRedirection> }) => {
      return (
        <Badge variant="outline" className="capitalize">
          {row.original.platform}
        </Badge>
      );
    },
  },
  {
    accessorKey: "urls_from",
    header: "Source URLs",
    cell: ({ row }: { row: Row<PageRedirection> }) => {
      const urls = row.original.urls_from;
      const firstUrl = urls[0]?.url;
      const additionalCount = urls.length - 1;

      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[300px]">{firstUrl}</span>
          {additionalCount > 0 && (
            <Badge variant="secondary">+{additionalCount}</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "url_to",
    header: "Target URL",
    cell: ({ row }: { row: Row<PageRedirection> }) => row.original.url_to,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }: { row: Row<PageRedirection> }) => {
      return (
        <Badge variant="outline" className="capitalize">
          {row.original.type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }: { row: Row<PageRedirection> }) => {
      return format(new Date(row.original.createdAt), "PPp");
    },
  },
  {
    id: "actions",
    cell: ({ row }: { row: Row<PageRedirection> }) => {
      return (
        <Link href={`/dashboard/redirections/pages/${row.original._id}`}>
          <Button variant="ghost" size="sm">
            View Details
          </Button>
        </Link>
      );
    },
  },
];

interface DataTableProps {
  data: PageRedirection[];
  pageCount: number;
  currentPage: number;
  onPaginationChange: (page: number) => void;
  onSearchChange: (value: string) => void;
}

export function PagesRedirectionsTable({
  data,
  pageCount,
  currentPage,
  onPaginationChange,
  onSearchChange,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Input
          placeholder="Search by ID or URL..."
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            onSearchChange(event.target.value);
          }}
          className="max-w-sm"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<PageRedirection>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<PageRedirection, unknown>) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<PageRedirection>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell: Cell<PageRedirection, unknown>) => (
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