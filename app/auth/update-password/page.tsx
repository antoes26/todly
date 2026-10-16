import { redirect } from "next/navigation";
import { getAppUser } from "../../../lib/auth-context";
import { AuthPanel } from "../../auth-panel";

export const dynamic = "force-dynamic";
export default async function UpdatePassword() {
  if (!await getAppUser()) redirect("/?auth_error=expired");
  return <AuthPanel configured initialMode="updatePassword" />;
}
