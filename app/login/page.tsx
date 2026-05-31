import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  authOptions,
  isAppleAuthConfigured,
  isGoogleAuthConfigured,
  isWechatAuthConfigured,
  isXAuthConfigured,
} from "@/auth";
import LoginPageClient from "@/components/LoginPageClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/start");
  }

  return (
    <LoginPageClient
      isAppleEnabled={isAppleAuthConfigured}
      isGoogleEnabled={isGoogleAuthConfigured}
      isWechatEnabled={isWechatAuthConfigured}
      isXEnabled={isXAuthConfigured}
    />
  );
}
