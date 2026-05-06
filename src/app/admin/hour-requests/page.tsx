import { redirect } from "next/navigation";

export default function HourRequestsPage() {
  redirect("/admin/pending-shifts");
}

