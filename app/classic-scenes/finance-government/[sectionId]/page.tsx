import { notFound } from "next/navigation";
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

  return <FinanceGovernmentSectionMenuPage section={section} />;
}
