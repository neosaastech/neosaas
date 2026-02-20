# Copilot Instructions — NeoSaaS

> **Ces règles s'appliquent à TOUS les agents IA (Copilot, Cursor, ChatGPT, Claude, etc.)** travaillant sur ce repository.

---

## 📋 Règle #1 : Documentation Obligatoire à Chaque Itération

**Chaque modification de code DOIT être accompagnée d'une mise à jour de la documentation correspondante.**

### Quand mettre à jour la documentation ?

| Situation | Action Documentation |
|-----------|---------------------|
| Nouveau fichier / composant | Ajouter dans `ARCHITECTURE.md` + `DOCUMENTATION_INDEX.md` |
| Modification d'un fichier existant | Mettre à jour le(s) doc(s) qui le référencent |
| Correction de bug | Ajouter entrée dans le Changelog de la doc concernée |
| Changement d'API / endpoint | Mettre à jour `ADMIN_API_MANAGEMENT.md` |
| Changement de flux checkout | Mettre à jour `CHECKOUT_FLOW.md` |
| Changement d'auth / OAuth | Mettre à jour les docs OAuth correspondantes |
| Changement admin dashboard | Mettre à jour `ADMIN_DASHBOARD_ORGANIZATION.md` |
| Changement de paiement | Mettre à jour `STRIPE_INTEGRATION.md` + `CHECKOUT_FLOW.md` |
| Ajout/suppression de dépendance | Mettre à jour `ARCHITECTURE.md` (section Stack) |

### Quels fichiers mettre à jour ?

1. **Toujours** : le doc le plus proche du code modifié
2. **Si applicable** : `STATUS.md` (historique des changements)
3. **Si applicable** : `DOCUMENTATION_INDEX.md` (nouveau doc ou restructuration)
4. **Si applicable** : `00-START-HERE.md` (changement majeur de stack ou fonctionnalité)

### Format du Changelog dans les docs

```markdown
## 📅 Changelog

### [DATE]
- **[Résumé court]** : Description de ce qui a changé
- **Fichiers modifiés** : `fichier1.tsx`, `fichier2.ts`
- **Impact** : Ce qui change pour l'utilisateur / développeur
```

---

## 📋 Règle #2 : Lecture Préalable de la Documentation

**Avant de modifier un fichier, LIRE la documentation associée** pour comprendre le contexte et éviter les régressions.

### Point d'entrée obligatoire

1. Lire `docs/00-START-HERE.md` pour comprendre la structure
2. Lire `docs/ARCHITECTURE.md` pour les conventions
3. Lire le doc spécifique au module que vous modifiez

---

## 📋 Règle #3 : Conventions de Code

### Stack Technique
- **Framework** : Next.js 15 (App Router)
- **ORM** : Drizzle ORM + PostgreSQL (Neon)
- **Paiements** : Stripe Direct (pas Lago — retiré 16 fév. 2026)
- **Auth** : Custom JWT avec OAuth (GitHub, Google)
- **UI** : Tailwind CSS + shadcn/ui
- **Package Manager** : pnpm

### Patterns
- Server Actions dans `app/actions/`
- API routes dans `app/api/`
- Composants admin dans `components/admin/`
- Types dans `types/`
- Auth utilise `roles?: string[]` (tableau, PAS `role` singulier)

### Base de données
- Table `platform_config` : key-value store pour configuration globale
- Table `service_api_configs` : credentials API avec champ `environment` (production/test/sandbox)
- Table `users` : utilisateurs avec rôles

---

## 📋 Règle #4 : Vérifications Post-Modification

Après chaque itération, vérifier :
- [ ] Pas d'erreurs TypeScript (`get_errors`)
- [ ] Documentation mise à jour
- [ ] Imports utilisés (pas d'imports morts)
- [ ] Patterns cohérents avec le reste du codebase

---

## 📁 Structure Documentation

```
docs/
├── 00-START-HERE.md          ← Point d'entrée
├── ARCHITECTURE.md           ← Architecture globale
├── STATUS.md                 ← État actuel + historique
├── DOCUMENTATION_INDEX.md    ← Index de tous les docs
├── CHECKOUT_FLOW.md          ← Tunnel d'achat
├── STRIPE_INTEGRATION.md     ← Paiements Stripe
├── ADMIN_*.md                ← Documentation admin
└── setup/                    ← Guides d'installation
```

---

*Dernière mise à jour : 16 février 2026*
