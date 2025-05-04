export type SiteConfig = {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
  }
  mainNav: {
    title: string
    href: string
  }[]
}

export const siteConfig: SiteConfig = {
  name: "NeoSaaS",
  description: "The Complete SaaS Platform for Modern Businesses",
  url: "https://neosaas.com",
  ogImage: "/og.jpg",
  links: {
    twitter: "https://twitter.com/neosaas",
    github: "https://github.com/neosaas",
  },
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Features",
      href: "/features",
    },
    {
      title: "Pricing",
      href: "/pricing",
    },
    {
      title: "Docs",
      href: "/docs",
    },
    {
      title: "Blog",
      href: "/blog",
    },
  ],
}
