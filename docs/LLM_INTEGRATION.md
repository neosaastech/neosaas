# Intégration LLM - Réponses Automatiques

## Vue d'ensemble

Ce module permet d'intégrer des providers LLM (Mistral, OpenAI, Anthropic, Groq) pour des réponses automatiques dans le chat support et d'autres fonctionnalités.

## Providers Supportés

| Provider | Modèle par défaut | Documentation |
|----------|-------------------|---------------|
| **Mistral** | mistral-large-latest | [console.mistral.ai](https://console.mistral.ai/) |
| **OpenAI** | gpt-5 | [platform.openai.com](https://platform.openai.com/) |
| **Anthropic** | claude-3-sonnet-20240229 | [console.anthropic.com](https://console.anthropic.com/) |
| **Groq** | llama-3.1-70b-versatile | [console.groq.com](https://console.groq.com/) |

## Configuration

### 1. Variable d'environnement

Ajoutez une clé de chiffrement pour sécuriser les API keys :

```env
# .env.local
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 2. Générer une clé API

#### Mistral
1. Créez un compte sur [console.mistral.ai](https://console.mistral.ai/)
2. Allez dans "API Keys"
3. Cliquez "Create new key"
4. Copiez la clé (format: `xxx...xxx`)

#### OpenAI
1. Créez un compte sur [platform.openai.com](https://platform.openai.com/)
2. Allez dans "API Keys"
3. Cliquez "Create new secret key"
4. Copiez la clé (format: `sk-proj-xxx...xxx`)

#### Anthropic
1. Créez un compte sur [console.anthropic.com](https://console.anthropic.com/)
2. Allez dans "API Keys"
3. Cliquez "Create Key"
4. Copiez la clé (format: `sk-ant-xxx...xxx`)

#### Groq
1. Créez un compte sur [console.groq.com](https://console.groq.com/)
2. Allez dans "API Keys"
3. Cliquez "Create API Key"
4. Copiez la clé

## API Endpoints

### Gestion des clés

```
GET  /api/llm/keys           # Liste des clés
POST /api/llm/keys           # Ajouter une clé
GET  /api/llm/keys/[id]      # Détail d'une clé
PATCH /api/llm/keys/[id]     # Modifier une clé
DELETE /api/llm/keys/[id]    # Supprimer une clé
```

### Chat LLM

```
POST /api/llm/chat           # Envoyer un message au LLM
```

## Utilisation

### Ajouter une clé API

```typescript
const response = await fetch('/api/llm/keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'mistral',  // 'mistral' | 'openai' | 'anthropic' | 'groq'
    name: 'Ma clé Mistral',
    apiKey: 'xxx...xxx',
    isDefault: true,
    metadata: {
      preferredModel: 'mistral-large-latest'
    }
  })
})
```

### Envoyer un message au LLM

```typescript
const response = await fetch('/api/llm/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'mistral',
    message: 'Bonjour, comment puis-je vous aider ?',
    model: 'mistral-large-latest',  // optionnel
    systemPrompt: 'Tu es un assistant support client.',  // optionnel
    temperature: 0.7,  // optionnel (0-2)
    maxTokens: 1024,  // optionnel
    conversationId: 'uuid...'  // optionnel, pour le tracking
  })
})

// Response
{
  "success": true,
  "data": {
    "response": "Bonjour ! Je suis là pour vous aider...",
    "model": "mistral-large-latest",
    "provider": "mistral",
    "usage": {
      "promptTokens": 25,
      "completionTokens": 150,
      "totalTokens": 175
    },
    "latencyMs": 1234
  }
}
```

## Base de données

### `llm_api_keys`

Stocke les clés API chiffrées (AES-256-GCM).

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| userId | UUID | Propriétaire de la clé |
| provider | text | 'mistral' \| 'openai' \| 'anthropic' \| 'groq' |
| name | text | Nom de la clé |
| encryptedKey | text | Clé chiffrée |
| keyPrefix | text | Préfixe visible (ex: "sk-proj-...") |
| isActive | boolean | Clé active |
| isDefault | boolean | Clé par défaut pour le provider |
| usageCount | integer | Nombre d'utilisations |

### `llm_usage_logs`

Tracking de l'utilisation pour analytics et coûts.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| keyId | UUID | Référence à la clé |
| provider | text | Provider utilisé |
| model | text | Modèle utilisé |
| promptTokens | integer | Tokens en entrée |
| completionTokens | integer | Tokens en sortie |
| totalTokens | integer | Total tokens |
| estimatedCost | integer | Coût estimé (cents) |
| latencyMs | integer | Temps de réponse |
| status | text | 'success' \| 'error' \| 'rate_limited' |

## Sécurité

### Chiffrement des clés

Les clés API sont chiffrées avec AES-256-GCM avant stockage :

```typescript
// Chiffrement
iv:authTag:encryptedData

// La clé de chiffrement est dérivée de ENCRYPTION_KEY via scrypt
```

### Bonnes pratiques

1. **Ne jamais exposer les clés** : Les endpoints ne renvoient jamais `encryptedKey`
2. **Rotation régulière** : Changez vos clés périodiquement
3. **Limites d'usage** : Configurez des limites chez les providers
4. **Monitoring** : Surveillez `llm_usage_logs` pour détecter les abus

## Limites et coûts

### Tarification indicative (2024)

| Provider | Modèle | Input | Output |
|----------|--------|-------|--------|
| Mistral | mistral-large | $2/1M tokens | $6/1M tokens |
| OpenAI | gpt-4-turbo | $10/1M tokens | $30/1M tokens |
| Anthropic | claude-3-sonnet | $3/1M tokens | $15/1M tokens |
| Groq | llama-3.1-70b | $0.59/1M tokens | $0.79/1M tokens |

### Limites de taux (Rate Limits)

Consultez la documentation de chaque provider pour les limites actuelles.

## Intégration avec le Chat Support

### Auto-réponse (TODO)

L'intégration avec le module de chat pour des réponses automatiques est prévue :

```typescript
// Exemple d'implémentation future
async function handleNewChatMessage(message: ChatMessage) {
  // 1. Vérifier si l'auto-réponse est activée
  const settings = await getChatSettings()
  if (!settings.autoResponseEnabled) return

  // 2. Appeler le LLM
  const llmResponse = await fetch('/api/llm/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider: settings.defaultLlmProvider,
      message: message.content,
      systemPrompt: settings.llmSystemPrompt,
      conversationId: message.conversationId
    })
  })

  // 3. Créer le message de réponse
  await createChatMessage({
    conversationId: message.conversationId,
    senderType: 'system',
    senderName: 'Assistant IA',
    content: llmResponse.data.response,
  })
}
```

## Tests

### Test de la clé

```bash
# Via cURL
curl -X POST /api/llm/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{
    "provider": "mistral",
    "message": "Dis bonjour en français"
  }'
```

### Vérification du chiffrement

Les clés stockées en base doivent être sous forme chiffrée :
```
iv_hex:tag_hex:encrypted_hex
```

## Roadmap

- [ ] Interface de gestion des clés dans les settings
- [ ] Auto-réponse dans le chat support
- [ ] Estimation des coûts en temps réel
- [ ] Support du streaming (SSE)
- [ ] Historique des conversations LLM
- [ ] Templates de prompts personnalisables
