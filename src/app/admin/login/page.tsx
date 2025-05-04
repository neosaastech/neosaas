"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [adminExists, setAdminExists] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const res = await fetch("/api/check-admin")
      const data = await res.json()
      setAdminExists(data.adminExists)
    }

    checkAdmin()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminExists) {
      // Aucun admin → setup obligatoire
      if (password === process.env.NEXT_PUBLIC_ADMIN_TEMP_PASSWORD) {
        router.push("/admin/setup")
      } else {
        alert("Mot de passe temporaire incorrect.")
      }
      return
    }

    // Ici, INTERDICTION d'utiliser 123456 si admin existe
    if (password === process.env.NEXT_PUBLIC_ADMIN_TEMP_PASSWORD) {
      alert("Accès temporaire désactivé. Utilisez votre compte admin.")
      return
    }

    // Ici tu pourras connecter ton admin normal plus tard
    alert("Pas encore de connexion standard active.")
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl mb-6 text-center font-bold">{adminExists ? "Connexion Admin" : "Setup Initial"}</h2>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-4"
        />
        <button type="submit" className="bg-black text-white px-4 py-2 w-full">
          {adminExists ? "Connexion" : "Créer Admin"}
        </button>
      </form>
    </div>
  )
}
