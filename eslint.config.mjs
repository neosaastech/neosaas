import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    // 27/10/2026 : règles du React Compiler apportées par eslint-config-next 16. Le compilateur n'est pas activé
    // (next.config.mjs) : elles signalent des optimisations, pas des erreurs d'exécution. Gardées visibles en
    // avertissement, à repasser en erreur le jour où le compilateur est activé et les composants revus.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default eslintConfig;
