import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import RegisterPageClient from "@/components/RegisterPageClient";

type RegisterPageProps = {
  searchParams?: Promise<{ ref?: string | string[] }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const rawReferralCode = Array.isArray(params?.ref)
    ? params?.ref[0]
    : params?.ref;

  return <RegisterPageClient initialReferralCode={rawReferralCode || ""} />;
}
