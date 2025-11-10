import { signIn } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const result = await signIn("github", {
      redirect: false,
      redirectTo: "/dashboard",
    })

    return NextResponse.json({ url: result })
  } catch (error) {
    console.error("[v0] GitHub sign-in error:", error)
    return NextResponse.json({ error: "Failed to initiate GitHub sign-in" }, { status: 500 })
  }
}
