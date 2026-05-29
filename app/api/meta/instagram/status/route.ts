import { GET as getInstagramGraphStatus } from "@/app/api/instagram/status/route";

export async function GET() {
  return getInstagramGraphStatus();
}
