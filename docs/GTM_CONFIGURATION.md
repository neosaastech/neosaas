# Configuration Google Tag Manager (GTM)

## Format Requis

Le code Google Tag Manager doit respecter le format suivant :

```
GTM-XXXXXXX
```

Où `XXXXXXX` est une série d'au moins 7 caractères alphanumériques (A-Z, 0-9).

## Exemples Valides

✅ `GTM-ABCD123`
✅ `GTM-5NWQRXM`
✅ `GTM-K8L9M0N`
✅ `GTM-ABCDEFG123`

## Exemples Invalides

❌ `GTM-ABC` (trop court, moins de 7 caractères)
❌ `GTM123456` (manque le tiret)
❌ `gtm-ABCD123` (minuscules non standardisées)
❌ `ABCD123` (manque le préfixe GTM-)

## Validation en Temps Réel

L'interface admin valide automatiquement le format GTM :

1. **Saisie** : Tapez votre code GTM dans le champ
2. **Validation** : La validation se déclenche automatiquement lors de la saisie et au blur
3. **Feedback visuel** :
   - ✅ **Icône verte** + bordure verte = Format valide
   - ❌ **Icône rouge** + bordure rouge = Format invalide
   - Message d'erreur explicite affiché sous le champ

## Configuration

### Via l'Interface Admin

1. Accédez à **Admin > Settings > General**
2. Trouvez la section **"Site Status"**
3. Saisissez votre code GTM dans le champ **"Google Tag Manager ID"**
4. La validation se fait automatiquement
5. Le code est sauvegardé automatiquement après 1,5 seconde

### Injection Automatique

Une fois configuré, le script GTM est automatiquement injecté dans toutes les pages :

```html
<!-- Dans le <head> -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');
</script>

<!-- Dans le <body> -->
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
  height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
```

## Où Trouver Votre Code GTM

1. Connectez-vous à [Google Tag Manager](https://tagmanager.google.com/)
2. Sélectionnez votre compte et conteneur
3. Le code GTM apparaît en haut à droite (format : `GTM-XXXXXXX`)
4. Vous pouvez aussi le trouver dans **Admin > Install Google Tag Manager**

## Vérification

Pour vérifier que GTM fonctionne correctement :

1. **Google Tag Assistant** : Extension Chrome pour déboguer GTM
2. **Console du navigateur** : Vérifiez la présence de `dataLayer`
3. **GTM Preview Mode** : Utilisez le mode aperçu dans GTM
4. **Network Tab** : Vérifiez que `gtm.js` se charge

## Sécurité

- ✅ Le code GTM est échappé pour éviter les injections XSS
- ✅ Validation stricte du format avant sauvegarde
- ✅ Seuls les codes au format GTM-XXXXXXX sont acceptés
- ⚠️ Assurez-vous de ne partager votre code GTM qu'avec des personnes de confiance

## Support

En cas de problème :

1. Vérifiez le format du code (GTM-XXXXXXX)
2. Consultez les logs dans Admin > Settings > System Logs
3. Vérifiez que le conteneur GTM est publié
4. Testez en mode incognito pour éviter les extensions conflictuelles
