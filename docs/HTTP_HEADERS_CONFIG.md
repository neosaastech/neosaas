# Configuration des En-têtes HTTP Personnalisés

## Emplacement de la Configuration

Les en-têtes HTTP personnalisés sont maintenant configurés dans **`next.config.mjs`** au lieu d'un middleware obsolète.

## Configuration par Défaut

Les en-têtes de sécurité suivants sont appliqués automatiquement :

```javascript
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

## Configuration via l'Interface Admin

Vous pouvez également configurer des en-têtes HTTP personnalisés via l'interface admin :

1. Accédez à **Admin > Settings > General**
2. Faites défiler jusqu'au module **"Custom Code Injection"**
3. Dans la section **"Custom HTTP Headers"**, ajoutez vos en-têtes au format JSON :

```json
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}
```

## En-têtes de Sécurité Recommandés

### X-Frame-Options
Empêche le clickjacking en interdisant l'affichage de votre site dans une iframe.
- `DENY` : Bloque totalement
- `SAMEORIGIN` : Autorise seulement le même domaine

### X-Content-Type-Options
Empêche le navigateur de "sniffer" le type MIME.
- Valeur recommandée : `nosniff`

### Strict-Transport-Security (HSTS)
Force l'utilisation de HTTPS.
- Valeur recommandée : `max-age=31536000; includeSubDomains; preload`

### Content-Security-Policy (CSP)
Contrôle les ressources que le navigateur peut charger.
- Exemple : `default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`

### Referrer-Policy
Contrôle les informations de référence envoyées.
- Valeur recommandée : `strict-origin-when-cross-origin`

### Permissions-Policy
Contrôle l'accès aux API du navigateur.
- Exemple : `geolocation=(), microphone=(), camera=()`

## Validation

Les en-têtes sont validés automatiquement :
- Format JSON requis
- Erreur 400 si le format est invalide
- Sauvegarde automatique après validation

## Notes Importantes

⚠️ **Attention** : Des en-têtes incorrects peuvent casser votre site. Testez toujours vos modifications.

✅ **Next.js 16** : La configuration des headers se fait uniquement via `next.config.mjs` pour les headers statiques, ou via l'API pour les headers dynamiques.

🔄 **Migration** : L'ancien `middleware.ts` a été supprimé car obsolète dans Next.js 16.
