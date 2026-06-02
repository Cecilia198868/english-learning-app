import AiGuidedExpressionStepOne from "@/components/AiGuidedExpressionStepOne";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  return <AiGuidedExpressionStepOne showGuestProgress={!session?.user} />;
}
