import { NativeFlowRecordsPage } from "@/components/NativeFlowPages";
import { nativeFlowProgressRows } from "@/data/nativeFlow/mockData";

export default function Page() {
  return <NativeFlowRecordsPage progressRows={nativeFlowProgressRows} />;
}
