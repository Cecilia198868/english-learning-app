import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { cookies } from "next/headers";
import EnglishDashboardClient from "@/components/EnglishDashboardClient";
import DashboardClient from "./DashboardClient";
import { LANGUAGE_COOKIE_NAME, normalizeLanguage } from "@/lib/i18n";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const language = normalizeLanguage(
    cookieStore.get(LANGUAGE_COOKIE_NAME)?.value
  );

  if (!session?.user) {
    redirect("/login");
  }

  if (language === "en") {
    return (
      <EnglishDashboardClient
        userEmail={session.user.email || "Signed-in user"}
        userImage={session.user.image || ""}
      />
    );
  }

  return (
    <DashboardClient
      userEmail={session.user.email || "Signed-in user"}
      userImage={session.user.image || ""}
    />
  );
}
