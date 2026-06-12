import { NativeFlowMenuPage } from "@/components/NativeFlowPages";
import { nativeFlowLevels } from "@/data/nativeFlow/mockData";

export default function Page() {
  return <NativeFlowMenuPage levels={nativeFlowLevels} />;
}
