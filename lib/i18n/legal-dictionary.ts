// Static UI text for legal/consent surfaces (cookie popup, /legal/privacy,
// /legal/terms) — the one bit of interface copy in this app that isn't
// admin-authored content, so there's no Payload/DB row to localize. No
// dictionary system existed anywhere in the repo before this (confirmed by
// audit, 2026-07-15) — this is intentionally small and scoped to these
// three surfaces, not a general-purpose i18n framework.
//
// Legal-page body text below is a working translation, not a
// lawyer/DPO-reviewed official text — swap it out before treating it as
// binding legal copy (Charles, 2026-07-15: routing/language-correctness
// matters more right now than perfecting the legal formulation).

export type SupportedLocale = "fr" | "en"

export const cookieConsentDictionary = {
  fr: {
    title: "Préférences cookies",
    learnMore: "En savoir plus",
    decline: "Refuser",
    accept: "Accepter",
    defaultMessage:
      "Nous utilisons des cookies pour améliorer votre expérience sur notre site. En continuant à naviguer, vous acceptez notre utilisation des cookies.",
  },
  en: {
    title: "Cookie Preferences",
    learnMore: "Learn more",
    decline: "Decline",
    accept: "Accept",
    defaultMessage: "We use cookies to ensure you get the best experience on our website.",
  },
} as const satisfies Record<SupportedLocale, Record<string, string>>

export const privacyPageDictionary = {
  fr: {
    metaTitle: "Politique de confidentialité",
    metaDescription:
      "Notre politique de confidentialité explique comment nous collectons, utilisons et protégeons vos données personnelles.",
    heading: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour :",
    intro: {
      title: "1. Introduction",
      body: (siteName: string) =>
        `Bienvenue sur ${siteName} (« nous », « notre » ou « nos »). Nous nous engageons à protéger vos données personnelles et votre droit à la vie privée. Pour toute question concernant cette politique ou nos pratiques relatives à vos données personnelles, veuillez nous contacter.`,
    },
    collect: {
      title: "2. Données que nous collectons",
      body1:
        "Nous collectons les données personnelles que vous nous fournissez volontairement lors de votre inscription au service, lorsque vous exprimez un intérêt pour nos produits et services, ou lorsque vous nous contactez.",
      body2:
        "Les données personnelles que nous collectons dépendent du contexte de vos interactions avec nous et le service, des choix que vous faites, ainsi que des produits et fonctionnalités que vous utilisez. Cela peut inclure :",
      item1: "Nom et coordonnées.",
      item1Rest: "Nous collectons votre nom, prénom, adresse e-mail, adresse postale, numéro de téléphone et autres données de contact similaires.",
      item2: "Identifiants.",
      item2Rest: "Nous collectons les mots de passe, indices de mot de passe et autres informations de sécurité utilisées pour l'authentification et l'accès au compte.",
    },
    use: {
      title: "3. Utilisation de vos données",
      body: "Nous utilisons les données personnelles collectées via nos services à diverses fins commerciales décrites ci-dessous. Nous traitons vos données personnelles sur la base de nos intérêts commerciaux légitimes, pour conclure ou exécuter un contrat avec vous, avec votre consentement, et/ou pour respecter nos obligations légales.",
      item1: "Faciliter la création de compte et la connexion.",
      item2: "Vous envoyer des communications marketing et promotionnelles.",
      item3: "Vous envoyer des informations administratives.",
    },
    compliance: {
      title: "4. Conformité au règlement européen (DSA/DMA)",
      body1:
        "Nous nous engageons à respecter le Digital Services Act (DSA) et le Digital Markets Act (DMA) afin de garantir un environnement numérique sûr et équitable. Nos pratiques de collecte et de traitement des données sont conçues pour répondre aux exigences de transparence et de responsabilité fixées par ces réglementations.",
      body2: "Pour plus d'informations sur la réglementation européenne des plateformes numériques et la protection des droits des utilisateurs, consultez la documentation officielle :",
      linkTitle: "Digital Markets Act et Digital Services Act de l'UE",
      linkSubtitle: "Lire l'explication officielle sur europarl.europa.eu",
    },
    contact: {
      title: "5. Nous contacter",
      body: "Pour toute question ou remarque concernant cette politique, vous pouvez nous contacter par e-mail.",
      button: "Contacter l'équipe confidentialité",
    },
    company: {
      personTitle: "Responsable du site",
      entityTitle: "Entité juridique",
      nameLabel: "Nom / Organisation",
      siret: "SIRET",
      vat: "Numéro de TVA",
      dpo: "Super Admin / DPO",
    },
  },
  en: {
    metaTitle: "Privacy Policy",
    metaDescription:
      "Our privacy policy explains how we collect, use, and protect your personal information. Read our data protection and privacy practices.",
    heading: "Privacy Policy",
    lastUpdated: "Last updated:",
    intro: {
      title: "1. Introduction",
      body: (siteName: string) =>
        `Welcome to ${siteName} ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.`,
    },
    collect: {
      title: "2. Information We Collect",
      body1:
        "We collect personal information that you voluntarily provide to us when registering at the Services expressing an interest in obtaining information about us or our products and services, when participating in activities on the Services or otherwise contacting us.",
      body2:
        "The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make and the products and features you use. The personal information we collect can include the following:",
      item1: "Name and Contact Data.",
      item1Rest: "We collect your first and last name, email address, postal address, phone number, and other similar contact data.",
      item2: "Credentials.",
      item2Rest: "We collect passwords, password hints, and similar security information used for authentication and account access.",
    },
    use: {
      title: "3. How We Use Your Information",
      body: "We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.",
      item1: "To facilitate account creation and logon process.",
      item2: "To send you marketing and promotional communications.",
      item3: "To send administrative information to you.",
    },
    compliance: {
      title: "4. Compliance with EU Regulations (DSA/DMA)",
      body1:
        "We are committed to complying with the Digital Services Act (DSA) and Digital Markets Act (DMA) to ensure a safe and fair digital environment. Our data collection and processing practices are designed to meet the transparency and accountability standards set by these regulations.",
      body2: "For more information on how the EU regulates digital platforms and protects user rights, please refer to the official documentation:",
      linkTitle: "EU Digital Markets Act & Digital Services Act",
      linkSubtitle: "Read the official explanation on europarl.europa.eu",
    },
    contact: {
      title: "5. Contact Us",
      body: "If you have questions or comments about this policy, you may contact us via email.",
      button: "Contact Privacy Team",
    },
    company: {
      personTitle: "Site Manager (Responsable du site)",
      entityTitle: "Legal Entity",
      nameLabel: "Name / Organization",
      siret: "SIRET",
      vat: "VAT Number",
      dpo: "Super Admin / DPO",
    },
  },
} as const satisfies Record<SupportedLocale, unknown>

export const termsPageDictionary = {
  fr: {
    metaTitle: "Conditions Générales d'Utilisation",
    metaDescription: "Conditions générales d'utilisation et mentions légales. Consultez nos conditions d'utilisation, responsabilités et accords de service.",
    heading: "Conditions Générales d'Utilisation",
    notPublished: "Aucune condition générale d'utilisation n'a encore été publiée.",
    notPublishedAdminHint: "Si vous êtes administrateur, veuillez créer et publier les CGU depuis le panneau d'administration.",
    version: (version: string, date: string) => `Version ${version} — Date d'effet : ${date}`,
    contactTitle: "Informations de contact",
    contactBody: (email: string) => `Pour toute question concernant ces conditions, contactez-nous à ${email}.`,
  },
  en: {
    metaTitle: "Terms of Service",
    metaDescription: "Terms of Service and legal notices. Read our conditions of use, user responsibilities, and service agreements.",
    heading: "Terms of Service",
    notPublished: "No terms of service have been published yet.",
    notPublishedAdminHint: "If you are an administrator, please create and publish the Terms of Service from the admin panel.",
    version: (version: string, date: string) => `Version ${version} - Effective Date: ${date}`,
    contactTitle: "Contact Information",
    contactBody: (email: string) => `If you have any questions about these Terms, please contact us at ${email}.`,
  },
} as const satisfies Record<SupportedLocale, unknown>

export function resolveLegalLocale(locale: string): SupportedLocale {
  return locale === "en" ? "en" : "fr"
}
