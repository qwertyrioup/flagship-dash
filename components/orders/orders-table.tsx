"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderPayload } from "@/api/orders";
import { fetchOrdersAction } from "@/actions/orders-actions";

interface OrdersTableProps {
    initialData?: OrderPayload[];
    initialPageCount?: number;
}

const columns: ColumnDef<OrderPayload>[] = [
    { accessorKey: "first_name", header: "First Name" },
    { accessorKey: "last_name", header: "Last Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "country", header: "Country" },
    { accessorKey: "platform", header: "Platform" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge
                variant={
                    row.original.status === "pending" ? "secondary" : "default"
                }
            >
                {row.original.status}
            </Badge>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) =>
            new Date(row.original.createdAt).toLocaleString(),
    },
];

export function OrdersTable({
                                initialData = [],
                                initialPageCount = 0,
                            }: OrdersTableProps) {
    const [data, setData] = useState<OrderPayload[]>(initialData);
    const [pageCount, setPageCount] = useState<number>(initialPageCount);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchText, setSearchText] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isLoading, setIsLoading] = useState(false);
    const initialized = useRef(false);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const fetchPage = useCallback(async (page: number) => {
        setIsLoading(true);
        try {
            const res = await fetchOrdersAction({ page, limit: 25, search: searchText });
            if (
                res.success &&
                res.body &&
                "orders" in res.body &&
                Array.isArray(res.body.orders)
            ) {
                setData(res.body.orders);
                setPageCount(res.body.pagination.totalPages || 1);
                setCurrentPage(page);
            } else {
                setData([]);
                setPageCount(0);
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchText]);

    useEffect(() => {
        fetchPage(1);
    }, [fetchPage]);

    useEffect(() => {
        if (!initialized.current) {
            setData(initialData);
            setPageCount(initialPageCount);
            initialized.current = true;
        }
    }, [initialData, initialPageCount]);

    return (
        <div className="space-y-4 flex flex-col h-full">
            <Input
                placeholder="Search by email or platform…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="max-w-sm"
            />

            <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef
                                                    .header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="text-center"
                                >
                                    Loading…
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
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
                                    className="text-center"
                                >
                                    No orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={() => fetchPage(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                >
                    Previous
                </Button>
                <span>
                    Page {currentPage} of {pageCount || 1}
                </span>
                <Button
                    variant="outline"
                    onClick={() => fetchPage(currentPage + 1)}
                    disabled={currentPage >= pageCount || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
