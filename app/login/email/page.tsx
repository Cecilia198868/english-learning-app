import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import EmailLoginPageClient from "@/components/EmailLoginPageClient";

export default async function EmailLoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/");
  }

  return <EmailLoginPageClient />;
}
