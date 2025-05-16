import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import data from "./data.json";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <div className="px-4 lg:px-6">
        <DataTable data={data} />
      </div>
    </>
  );
}
