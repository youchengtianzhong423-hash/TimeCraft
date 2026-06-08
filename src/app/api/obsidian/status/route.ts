import { NextResponse } from "next/server";
import { checkVault } from "@/lib/obsidian-server";

export const runtime = "nodejs";

export async function GET() {
  const status = await checkVault();
  return NextResponse.json(status);
}
