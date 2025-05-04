"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AdminSetupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch("/api/create-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      alert("Admin créé avec succès !")
      router.push("/admin/login")
    } else {
      alert("Erreur lors de la création de l'admin.")
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleSetup} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl mb-6 text-center font-bold">Créer votre Compte Admin</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full mb-4"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-4"
        />
        <button type="submit" className="bg-black text-white px-4 py-2 w-full">
          Créer Admin
        </button>
      </form>
    </div>
  )
}
