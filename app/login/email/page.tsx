import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import EmailLoginPageClient from "@/components/EmailLoginPageClient";
import { getSafeInternalCallbackUrl } from "@/lib/loginRedirect";

type EmailLoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] | undefined }>;
};

export const dynamic = "force-dynamic";

export default async function EmailLoginPage({
  searchParams,
}: EmailLoginPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const callbackUrl = getSafeInternalCallbackUrl(params.callbackUrl);

  if (session?.user) {
    redirect(callbackUrl);
  }

  return <EmailLoginPageClient />;
}
