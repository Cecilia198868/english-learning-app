import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/auth";
import HomePageClient from "@/components/HomePageClient";
import { LANGUAGE_COOKIE_NAME, normalizeLanguage } from "@/lib/i18n";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const cookieStore = await cookies();
  const language = normalizeLanguage(
    cookieStore.get(LANGUAGE_COOKIE_NAME)?.value
  );

  if (session?.user) {
    redirect("/dashboard");
  }

  return <HomePageClient />;
}
