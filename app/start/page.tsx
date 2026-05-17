import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import StartPageClient from "@/components/StartPageClient";

export default async function StartPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  return (
    <StartPageClient
      userEmail={session.user.email || "Signed-in user"}
      userImage={session.user.image || ""}
    />
  );
}
