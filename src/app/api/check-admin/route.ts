import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
  const token = process.env.NEXT_PUBLIC_STRAPI_ADMIN_TOKEN;

  try {
    const res = await fetch(`${apiUrl}/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const users = await res.json();
    const adminExists = users.length > 0;

    return NextResponse.json({ adminExists });
  } catch (error) {
    console.error("Erreur de vérification admin", error);
    return NextResponse.json({ adminExists: false });
  }
}
