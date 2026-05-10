import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import LanguageSelectionPageClient from "@/components/LanguageSelectionPageClient";

export default async function LanguagesPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LanguageSelectionPageClient />;
}
