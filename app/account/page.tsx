import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AccountPageClient from "@/components/AccountPageClient";
import { DEFAULT_ADMIN_EMAIL, normalizeUserEmail } from "@/lib/userRoles";

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const userEmail = session.user.email || "";
  const isAdmin = normalizeUserEmail(userEmail) === DEFAULT_ADMIN_EMAIL;

  return (
    <AccountPageClient
      isAdmin={isAdmin}
      showProSuccessOnLoad={
        getStringParam(resolvedSearchParams.checkout) === "success"
      }
      userEmail={userEmail}
      userImage={session.user.image || ""}
      userName={session.user.name || ""}
    />
  );
}
