import { redirect } from "next/navigation";

/** `/` is protected; only signed-in users reach this component. */
export default function Home() {
  redirect("/marketplace");
}
