import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/auth";
import FinanceGovernmentSectionMenuPage from "@/components/FinanceGovernmentSectionMenuPage";
import {
  financeGovernmentSectionIds,
  getFinanceGovernmentSection,
} from "@/data/financeGovernmentSections";

export function generateStaticParams() {
  return financeGovernmentSectionIds.map((sectionId) => ({ sectionId }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const section = getFinanceGovernmentSection(sectionId);

  if (!section) {
    notFound();
  }

  const session = await getServerSession(authOptions);

  return (
    <FinanceGovernmentSectionMenuPage
      isGuest={!session?.user?.email}
      section={section}
    />
  );
}
