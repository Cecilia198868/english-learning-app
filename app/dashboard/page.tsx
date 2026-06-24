import { redirect } from "next/navigation";
import { getValidatedServerSession } from "@/lib/serverSession";

export default async function DashboardPage() {
  const { invalidated, session } = await getValidatedServerSession();

  if (invalidated) {
    redirect("/api/auth/session-replaced");
  }

  if (!session?.user) {
    redirect("/");
  }

  redirect("/start");
}
