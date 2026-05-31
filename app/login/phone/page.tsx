import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import PhoneLoginPageClient from "@/components/PhoneLoginPageClient";

export default async function PhoneLoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/start");
  }

  return <PhoneLoginPageClient />;
}
