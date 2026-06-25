import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  authOptions,
  isAppleAuthConfigured,
  isGoogleAuthConfigured,
} from "@/auth";
import LoginPageClient from "@/components/LoginPageClient";
import { getSafeInternalCallbackUrl } from "@/lib/loginRedirect";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] | undefined }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const callbackUrl = getSafeInternalCallbackUrl(params.callbackUrl);

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <LoginPageClient
      isAppleEnabled={isAppleAuthConfigured}
      isGoogleEnabled={isGoogleAuthConfigured}
    />
  );
}
