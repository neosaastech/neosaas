import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
  const token = process.env.NEXT_PUBLIC_STRAPI_ADMIN_TOKEN;

  try {
    const res = await fetch(`${apiUrl}/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        firstname: "Admin",
        lastname: "Admin",
        password,
        isActive: true, // Active directement
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Erreur création admin:", err);
      return NextResponse.json({ error: err }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API Strapi", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
