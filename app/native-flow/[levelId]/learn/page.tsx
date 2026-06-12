import { notFound } from "next/navigation";
import { NativeFlowLearningPage } from "@/components/NativeFlowPages";
import {
  getNativeFlowSentence,
  nativeFlowLevelIds,
} from "@/data/nativeFlow/mockData";

export function generateStaticParams() {
  return nativeFlowLevelIds.map((levelId) => ({ levelId }));
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ levelId: string }>;
  searchParams?: Promise<{ sentence?: string | string[] }>;
}) {
  const { levelId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sentenceParam = Number(getStringParam(resolvedSearchParams.sentence) || "1");
  const result = getNativeFlowSentence(levelId, sentenceParam);

  if (!result) {
    notFound();
  }

  return (
    <NativeFlowLearningPage
      level={result.level}
      sentence={result.sentence}
    />
  );
}
