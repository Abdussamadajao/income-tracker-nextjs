import { NextResponse } from "next/server";
import { getApiDocs } from "@/server/swagger/openapi";

export const dynamic = "force-static";

export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}


