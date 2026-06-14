import { NativeFlowMenuPage } from "@/components/NativeFlowPages";
import { nativeFlowLevels } from "@/data/nativeFlow/courseData";

export default function Page() {
  return <NativeFlowMenuPage levels={nativeFlowLevels} />;
}
