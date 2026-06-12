import { ToolFlow } from "@/components/tool/ToolFlow";
import { getSessionUser } from "@/lib/auth";

export default async function ToolPage() {
  const user = await getSessionUser();
  return <ToolFlow initialUser={user} />;
}
