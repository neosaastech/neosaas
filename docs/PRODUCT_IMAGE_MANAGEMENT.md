# Gestion des Images de Produits

## 📸 Vue d'ensemble

Le système de gestion des images de produits utilise une technique SVG innovante pour garantir des dimensions cohérentes sans nécessiter de bibliothèques lourdes de traitement d'image (comme Sharp ou Jimp).

## 🎯 Fonctionnalités

### ✅ Avantages
- **Dimensions cohérentes** : Toutes les images respectent un ratio 16:9 (1200x675px)
- **Pas de librairies lourdes** : Utilise SVG natif au lieu de Sharp/Jimp
- **Performance optimale** : Images encodées en base64 dans des conteneurs SVG
- **Compatibilité totale** : Fonctionne sur tous les navigateurs modernes
- **Stockage en base de données** : Pas de gestion de fichiers séparés

### 📏 Spécifications techniques

#### Dimensions
- **Ratio** : 16:9 (idéal pour affichage produits)
- **Résolution** : 1200x675 pixels
- **Taille max** : 3 MB par image
- **Formats acceptés** : JPEG, PNG, WebP, GIF

#### Processus de traitement
1. Upload de l'image originale
2. Conversion en base64
3. Encapsulation dans un conteneur SVG
4. Application du ratio 16:9 avec `preserveAspectRatio="xMidYMid slice"`
5. Stockage du SVG base64 en base de données

## 🔧 API Endpoints

### POST /api/products/image
Upload une nouvelle image pour un produit.

**Request:**
```typescript
FormData {
  image: File,      // Fichier image
  productId: string // ID du produit
}
```

**Response (Success):**
```json
{
  "success": true,
  "imageUrl": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...",
  "message": "Image uploaded and optimized successfully"
}
```

**Response (Error):**
```json
{
  "error": "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed"
}
```

**Validations:**
- Type de fichier : JPEG, PNG, WebP, GIF uniquement
- Taille : Maximum 3 MB
- Champs requis : image et productId

### DELETE /api/products/image
Supprime l'image d'un produit.

**Request:**
```
DELETE /api/products/image?productId=abc123
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

## 💻 Utilisation côté client

### Upload d'image

```typescript
const handleImageUpload = async (file: File, productId: string) => {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("productId", productId)

  try {
    const response = await fetch("/api/products/image", {
      method: "POST",
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      console.log("Image URL:", data.imageUrl)
      // Mettre à jour l'UI avec data.imageUrl
    } else {
      const error = await response.json()
      console.error("Upload failed:", error.error)
    }
  } catch (error) {
    console.error("Upload error:", error)
  }
}
```

### Suppression d'image

```typescript
const handleImageDelete = async (productId: string) => {
  try {
    const response = await fetch(
      `/api/products/image?productId=${productId}`,
      { method: "DELETE" }
    )

    if (response.ok) {
      console.log("Image deleted successfully")
      // Mettre à jour l'UI
    }
  } catch (error) {
    console.error("Delete error:", error)
  }
}
```

## 📐 Technique SVG

### Structure du SVG généré

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
  <defs>
    <clipPath id="product-clip">
      <rect width="1200" height="675" rx="8" />
    </clipPath>
  </defs>
  <rect width="1200" height="675" fill="#f3f4f6" />
  <image 
    href="data:image/jpeg;base64,/9j/4AAQSkZJRg..." 
    width="1200" 
    height="675" 
    preserveAspectRatio="xMidYMid slice" 
    clip-path="url(#product-clip)"
  />
</svg>
```

### Attributs clés

- **viewBox="0 0 1200 675"** : Définit l'espace de coordonnées (16:9)
- **preserveAspectRatio="xMidYMid slice"** : 
  - `xMidYMid` : Centre l'image horizontalement et verticalement
  - `slice` : Redimensionne pour remplir tout l'espace (crop si nécessaire)
- **clip-path** : Ajoute des coins arrondis (8px)
- **fill="#f3f4f6"** : Couleur de fond grise si l'image ne couvre pas tout

## 🎨 Affichage dans l'UI

### Image standard
```tsx
<img 
  src={product.imageUrl} 
  alt={product.title}
  className="w-full h-auto"
/>
```

### Image avec Next.js Image
```tsx
<Image 
  src={product.imageUrl} 
  alt={product.title}
  width={1200}
  height={675}
  className="w-full h-auto rounded-lg"
/>
```

### Card produit responsive
```tsx
<div className="relative aspect-video overflow-hidden rounded-lg">
  <Image 
    src={product.imageUrl} 
    alt={product.title}
    fill
    className="object-cover"
  />
</div>
```

## 🔄 Comparaison : Avant / Après

### ❌ Ancien système (fichiers physiques)
```typescript
// Problèmes :
- Gestion complexe des fichiers
- Dimensions inconsistantes
- Nécessite Sharp/Jimp pour resize
- Problèmes de paths relatifs
- Nettoyage manuel des anciens fichiers
- Plus lourd en dépendances
```

### ✅ Nouveau système (SVG + base64)
```typescript
// Avantages :
- Pas de gestion de fichiers
- Dimensions garanties (16:9)
- Pas de dépendances lourdes
- Stockage direct en DB
- Pas de nettoyage nécessaire
- Migration facile
```

## 📊 Limitations et considérations

### Taille des données
- Les images base64 sont ~33% plus grandes que les binaires
- Limite de 3MB recommandée pour éviter les problèmes de performance
- Pour des catalogues très larges (>10000 produits), considérer un CDN

### Performance
- ✅ Excellent pour <1000 produits
- ⚠️ Acceptable pour 1000-5000 produits
- ❌ CDN recommandé pour >5000 produits

### Alternatives pour scale massif
Si vous avez des milliers de produits :
1. Utiliser un CDN (Cloudinary, Uploadcare)
2. Implémenter Sharp pour optimisation serveur
3. Générer des versions multiples (thumbnail, medium, large)

## 🔍 Debugging

### Problème : Image ne s'affiche pas

**Vérifier :**
```typescript
// 1. Format du data URL
console.log(imageUrl.substring(0, 50))
// Devrait commencer par : "data:image/svg+xml;base64,"

// 2. Taille de l'image
console.log("Image size:", imageUrl.length)
// Devrait être < 4MB en string

// 3. Décoder pour voir le SVG
const svgContent = atob(imageUrl.split(',')[1])
console.log(svgContent)
// Devrait montrer le XML du SVG
```

### Problème : Upload échoue

**Codes d'erreur communs :**
- `400` : Fichier manquant ou productId invalide
- `400` : Type de fichier non supporté
- `400` : Fichier trop lourd (>3MB)
- `500` : Erreur serveur (vérifier les logs)

## 📚 Ressources complémentaires

### Documentation SVG
- [MDN - SVG Element](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/svg)
- [MDN - preserveAspectRatio](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio)

### Conversion base64
- [Base64 Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
- [Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)

## 🚀 Migration depuis l'ancien système

### Script de migration

```typescript
// scripts/migrate-product-images.ts
import { db } from "@/db"
import { products } from "@/db/schema"
import { readFile } from "fs/promises"
import { join } from "path"

async function migrateImages() {
  const allProducts = await db.select().from(products)
  
  for (const product of allProducts) {
    if (product.imageUrl?.startsWith('/images/products/')) {
      // Lire l'ancien fichier
      const filePath = join(process.cwd(), 'public', product.imageUrl)
      const buffer = await readFile(filePath)
      const base64 = buffer.toString('base64')
      const type = 'image/jpeg' // Ajuster selon extension
      
      // Créer le SVG
      const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
  <image href="data:${type};base64,${base64}" width="1200" height="675" preserveAspectRatio="xMidYMid slice" />
</svg>`.trim()
      
      const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`
      
      // Mettre à jour la DB
      await db.update(products)
        .set({ imageUrl })
        .where(eq(products.id, product.id))
      
      console.log(`Migrated: ${product.id}`)
    }
  }
}

migrateImages()
```

### Exécution
```bash
npx tsx scripts/migrate-product-images.ts
```

## ✨ Améliorations futures

### Court terme
- [ ] Compression automatique avant upload
- [ ] Preview en temps réel avec crop
- [ ] Support drag & drop
- [ ] Upload multiple

### Long terme
- [ ] CDN integration (Cloudinary)
- [ ] Optimisation automatique WebP
- [ ] Génération de thumbnails
- [ ] Lazy loading intelligent
