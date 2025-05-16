"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
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
import { searchWithFields } from "@/api/elastic-advanced-search";

interface Product {
  _id: string;
  id: string;
  catalog_number: string;
  name: string;
  supplier_id: string;
  supplier_name: string;
  size: string;
  buy_price: number;
  sell_price: number;
  discontinued: boolean;
}

interface SearchResponse {
  success: boolean;
  body: {
    products: Array<{
      _id: string;
      id: string;
      catalog_number: string;
      name: string;
      supplier_id: string;
      supplier_name: string;
      size: string;
      buy_price: number;
      sell_price: number;
      discontinued: boolean;
    }>;
    pages: number;
  };
}

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "catalog_number",
    header: "Catalog Number",
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="max-w-[500px] truncate">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "supplier_id",
    header: "Supplier ID",
  },
  {
    accessorKey: "supplier_name",
    header: "Supplier",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.supplier_name}
      </Badge>
    ),
  },
  {
    accessorKey: "size",
    header: "Size",
  },
  {
    accessorKey: "discontinued",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.discontinued ? "destructive" : "default"}>
        {row.original.discontinued ? "Discontinued" : "Active"}
      </Badge>
    ),
  },
  {
    accessorKey: "buy_price",
    header: () => <div className="text-right">Buy Price</div>,
    cell: ({ row }) => (
      <div className="text-right">
        €{row.original.buy_price ? row.original.buy_price.toFixed(2) : '0.00'}
      </div>
    ),
  },
  {
    accessorKey: "sell_price",
    header: () => <div className="text-right">Sell Price</div>,
    cell: ({ row }) => (
      <div className="text-right">
        €{row.original.sell_price ? row.original.sell_price.toFixed(2) : '0.00'}
      </div>
    ),
  },
];

interface DataTableProps {
  initialData: Product[];
  initialPageCount: number;
}

export function ProductsTable({ initialData, initialPageCount }: DataTableProps) {

  const [data, setData] = useState(initialData);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchText, setSearchText] = useState("");
  const [filtersState, setFiltersState] = useState({
    name_edge_ngram: "",
    supplier_name_edge_ngram: "",
    catalog_number_edge_ngram: "",
    supplier_catalog_number_edge_ngram: "",
    v_uniprot: "",
    v_gene_id: "",
    v_cas: "",
    c_pathogen: "",
    c_host: "",
    species: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const fieldsBody: string[] = [];
      if (filtersState.name_edge_ngram) fieldsBody.push(`name_edge_ngram:${filtersState.name_edge_ngram}`);
      if (filtersState.supplier_name_edge_ngram) fieldsBody.push(`supplier_name_edge_ngram:${filtersState.supplier_name_edge_ngram}`);
      if (filtersState.catalog_number_edge_ngram) fieldsBody.push(`catalog_number_edge_ngram:${filtersState.catalog_number_edge_ngram}`);
      if (filtersState.supplier_catalog_number_edge_ngram) fieldsBody.push(`supplier_catalog_number_edge_ngram:${filtersState.supplier_catalog_number_edge_ngram}`);
      if (filtersState.v_uniprot) fieldsBody.push(`v_uniprot:${filtersState.v_uniprot}`);
      if (filtersState.v_gene_id) fieldsBody.push(`v_gene_id:${filtersState.v_gene_id}`);
      if (filtersState.v_cas) fieldsBody.push(`v_cas:${filtersState.v_cas}`);
      if (filtersState.c_pathogen) fieldsBody.push(`c_pathogen:${filtersState.c_pathogen}`);
      if (filtersState.c_host) fieldsBody.push(`c_host:${filtersState.c_host}`);
      if (filtersState.species) fieldsBody.push(`species:${filtersState.species}`);

      const response = await searchWithFields(page, searchText, fieldsBody) as SearchResponse;
      if (response.success) {
        const products = response.body.products.map(
          (product) => ({
            _id: product._id,
            id: product.id,
            catalog_number: product.catalog_number,
            name: product.name,
            supplier_id: product.supplier_id,
            supplier_name: product.supplier_name,
            size: product.size,
            buy_price: product.buy_price,
            sell_price: product.sell_price,
            discontinued: product.discontinued,
          })
        );
        setData(products);
        setPageCount(response.body.pages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchText, filtersState]);

  useEffect(() => {
    handleSearch(1);
  }, [handleSearch]);

  const handleClear = () => {
    setSearchText("");
    setFiltersState({
      name_edge_ngram: "",
      supplier_name_edge_ngram: "",
      catalog_number_edge_ngram: "",
      supplier_catalog_number_edge_ngram: "",
      v_uniprot: "",
      v_gene_id: "",
      v_cas: "",
      c_pathogen: "",
      c_host: "",
      species: ""
    });
    setData(initialData);
    setPageCount(initialPageCount);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch(1);
  };

  // Close dialog on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDialog(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowDialog(false);
    }
    if (showDialog) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDialog]);

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) handleSearch(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < pageCount) handleSearch(currentPage + 1);
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Toolbar */}
      <div className="relative">
        {/* Full-width search bar */}
        <Input
          ref={inputRef}
          placeholder="Search by name, cat... (optional)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => setShowDialog(true)}
          onClick={() => setShowDialog(true)}
          onKeyDown={handleKeyDown}
          className="w-full border-2 focus:border-yellow-500 focus:ring-0 focus:outline-none"
        />
        {showDialog && (
          <form
            ref={dialogRef}
            className="absolute left-0 mt-2 w-full z-50 bg-white rounded-xl p-4 shadow border"
            onSubmit={e => { e.preventDefault(); handleSearch(1); }}
          >
            {/* Advanced filters block */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Input
                placeholder="Name"
                value={filtersState.name_edge_ngram}
                onChange={(e) => setFiltersState(prev => ({ ...prev, name_edge_ngram: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Supplier Name"
                value={filtersState.supplier_name_edge_ngram}
                onChange={(e) => setFiltersState(prev => ({ ...prev, supplier_name_edge_ngram: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Catalog Number"
                value={filtersState.catalog_number_edge_ngram}
                onChange={(e) => setFiltersState(prev => ({ ...prev, catalog_number_edge_ngram: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Supplier Catalog Number"
                value={filtersState.supplier_catalog_number_edge_ngram}
                onChange={(e) => setFiltersState(prev => ({ ...prev, supplier_catalog_number_edge_ngram: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="UniProt"
                value={filtersState.v_uniprot}
                onChange={(e) => setFiltersState(prev => ({ ...prev, v_uniprot: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Gene ID"
                value={filtersState.v_gene_id}
                onChange={(e) => setFiltersState(prev => ({ ...prev, v_gene_id: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="CAS Number"
                value={filtersState.v_cas}
                onChange={(e) => setFiltersState(prev => ({ ...prev, v_cas: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Pathogen"
                value={filtersState.c_pathogen}
                onChange={(e) => setFiltersState(prev => ({ ...prev, c_pathogen: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Host"
                value={filtersState.c_host}
                onChange={(e) => setFiltersState(prev => ({ ...prev, c_host: e.target.value }))}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Species"
                value={filtersState.species}
                onChange={(e) => setFiltersState(prev => ({ ...prev, species: e.target.value }))}
                className="max-w-[200px]"
              />
            </div>
            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-2">
              <Button
              size="sm"
                type="button"
                variant="secondary"
                className="hover:bg-secondary/70"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button size="sm" type="submit">
                Search
              </Button>
            </div>
          </form>
        )}
      </div>
      {/* Table */}
      <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
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
                    {isLoading ? "Loading..." : "No results."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination controls */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {pageCount}
        </span>
        <Button
          variant="outline"
          onClick={handleNextPage}
          disabled={currentPage === pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  );
} 