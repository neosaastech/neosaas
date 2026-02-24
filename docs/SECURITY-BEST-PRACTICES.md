# 🔐 Bonnes Pratiques de Sécurité - NeoSaaS

## Architecture de sécurité

### 1. Authentification (JWT)

✅ **BON**
```typescript
// Vérifier TOUJOURS l'auth dans les API Routes
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Logique métier...
}
```

❌ **MAUVAIS**
```typescript
// Ne JAMAIS faire confiance aux données côté client
export async function POST(request: NextRequest) {
  const { userId } = await request.json(); // ❌ Non sécurisé !
  // L'utilisateur peut envoyer n'importe quel userId
}
```

### 2. Cryptage des clés API

✅ **BON**
```typescript
// Le système actuel utilise AES-256-GCM + PBKDF2
import { encrypt, decrypt } from '@/lib/email/utils/encryption';

const encrypted = await encrypt(JSON.stringify(apiKey));
// Stockage: "salt:iv:encryptedData" (tout en base64)
```

❌ **MAUVAIS**
```typescript
// Ne JAMAIS stocker en clair
await db.insert({ apiKey: "SCWXXXXX" }); // ❌ Non crypté !

// Ne JAMAIS utiliser un cryptage simple
const encrypted = btoa(apiKey); // ❌ Base64 n'est PAS du cryptage !
```

### 3. Variables d'environnement

✅ **BON**
```typescript
// Toujours valider les variables
function getEncryptionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET est requis');
  }

  if (secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET doit faire au moins 32 caractères');
  }

  return secret;
}
```

❌ **MAUVAIS**
```typescript
// Ne JAMAIS hardcoder les secrets
const SECRET = "my-secret-123"; // ❌ Git history expose le secret

// Ne JAMAIS utiliser de fallback en production
const secret = process.env.SECRET || "fallback"; // ❌ Dangereux
```

---

## 🚨 Pièges courants à éviter

### 1. Next.js 16 - Params est une Promise

❌ **ANCIEN (Next.js 15)**
```typescript
export async function GET(req, { params }) {
  const { id } = params; // ❌ Ne fonctionne plus
}
```

✅ **NOUVEAU (Next.js 16)**
```typescript
export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ✅ Await requis
}
```

### 2. Cookies dans Next.js 16

❌ **MAUVAIS**
```typescript
import { cookies } from 'next/headers';

const token = cookies().get('auth-token'); // ❌ Synchrone ne fonctionne plus
```

✅ **BON**
```typescript
import { cookies } from 'next/headers';

const cookieStore = await cookies(); // ✅ Await requis
const token = cookieStore.get('auth-token');
```

### 3. Middleware vs Server Actions

⚠️ **À ÉVITER**
```typescript
// middleware.ts (traditionnel)
export function middleware(request) {
  // Ne fonctionne pas bien avec Next.js 16
}
```

✅ **PRÉFÉRER**
```typescript
// API Route avec vérification manuelle
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ...
}
```

### 4. Validation des entrées

❌ **DANGEREUX**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Utiliser directement body.xxx sans validation ❌
  await db.insert({ email: body.email });
}
```

✅ **SÉCURISÉ**
```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  apiKey: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Valider avec Zod
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error }, { status: 400 });
  }

  // Utiliser les données validées
  await db.insert({ email: result.data.email });
}
```

### 5. Gestion des erreurs sensibles

❌ **DANGEREUX**
```typescript
catch (error) {
  // Exposer les détails internes ❌
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

✅ **SÉCURISÉ**
```typescript
catch (error) {
  // Logger en interne
  console.error('Internal error:', error);

  // Renvoyer un message générique
  return NextResponse.json({
    error: 'Une erreur est survenue. Contactez le support.'
  }, { status: 500 });
}
```

---

## 🛡️ Checklist de sécurité

### Avant chaque déploiement

- [ ] Toutes les API Routes vérifient l'authentification
- [ ] Les clés API sont cryptées avant stockage
- [ ] Les variables d'environnement sont configurées sur Vercel
- [ ] `NEXTAUTH_SECRET` fait au moins 32 caractères
- [ ] Pas de secrets hardcodés dans le code
- [ ] Validation des entrées avec Zod ou équivalent
- [ ] Messages d'erreur ne révèlent pas d'informations sensibles
- [ ] Les paramètres SQL sont protégés contre les injections (Drizzle ORM le fait)
- [ ] HTTPS activé en production (Vercel le fait automatiquement)
- [ ] Rate limiting configuré si nécessaire

### Audit régulier

```bash
# Vérifier les secrets hardcodés
git grep -i "secret" | grep -v ".md"

# Vérifier les TODOs de sécurité
git grep -i "TODO.*security"

# Scanner les dépendances
npm audit

# Vérifier TypeScript
npx tsc --noEmit
```

---

## 📖 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/security)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
