import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import FinanceGovernmentMenuPage from "@/components/FinanceGovernmentMenuPage";

export default async function Page() {
  const session = await getServerSession(authOptions);

  return <FinanceGovernmentMenuPage isGuest={!session?.user?.email} />;
}
