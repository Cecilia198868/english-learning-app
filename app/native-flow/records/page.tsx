import { NativeFlowRecordsPage } from "@/components/NativeFlowPages";
import { nativeFlowLevels, nativeFlowProgressRows } from "@/data/nativeFlow/courseData";

export default function Page() {
  return (
    <NativeFlowRecordsPage
      levels={nativeFlowLevels}
      progressRows={nativeFlowProgressRows}
    />
  );
}
