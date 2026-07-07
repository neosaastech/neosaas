import { redirect } from "next/navigation";

/**
 * ⚠️ Cette page a été déplacée vers /admin/api
 * 
 * La configuration GitHub OAuth automatique est maintenant intégrée
 * dans la page principale de gestion des API à /admin/api
 */
export default function APIManagementPage() {
  redirect("/admin/api");
}
