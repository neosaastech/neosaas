# Scripts Automatiques de Neosaas

## 🎯 Objectif

Centraliser tous les scripts qui automatisent les tâches internes au framework Neosaas.

---

## 📜 Liste des scripts

### 1. `generate-indexes.ts`

- **Rôle** : Générer automatiquement les `index.ts` pour chaque dossier de `/components/`.
- **Exécuté** : 
  - Manuellement avec `npm run generate-indexes`
  - Automatiquement avant chaque `npm run build`
- **Pourquoi ?** :
  - Facilite les imports courts (`import { Button } from '@/components/ui/form-elements'`)
  - Évite les oublis et les erreurs humaines.
  - Rend le framework plus maintenable.

### 2. Autres scripts à venir

---

## 🛠 Comment exécuter

```bash
npm run generate-indexes
