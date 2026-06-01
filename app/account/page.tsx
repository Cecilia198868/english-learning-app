import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AccountPageClient from "@/components/AccountPageClient";
import { getUserRoleByEmail } from "@/lib/userStore";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const userEmail = session.user.email || "";
  const userRole = userEmail ? await getUserRoleByEmail(userEmail) : "user";

  return (
    <AccountPageClient
      isAdmin={userRole === "admin"}
      userEmail={userEmail}
      userImage={session.user.image || ""}
      userName={session.user.name || ""}
    />
  );
}
