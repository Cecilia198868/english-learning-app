import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import LoginPageClient from "@/components/LoginPageClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/speak-english");
  }

  return <LoginPageClient />;
}
