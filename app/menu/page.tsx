import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import GuestMenuPage from "@/components/GuestMenuPage";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/start");
  }

  return <GuestMenuPage />;
}
