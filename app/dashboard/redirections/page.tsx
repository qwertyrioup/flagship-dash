import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function RedirectionsPage() {
  redirect("/dashboard/redirections/products");
}