import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import ClassicScenesMenuPage from "@/components/ClassicScenesMenuPage";

export default async function Page() {
  const session = await getServerSession(authOptions);

  return <ClassicScenesMenuPage isGuest={!session?.user?.email} />;
}
