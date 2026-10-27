/**
 * Point d'extension schema pour les projets derives du boilerplate NeoSaaS.
 *
 * NEOKUBE-578 -- avant ce fichier, un derive (ex. NeoStudio) qui avait besoin de tables ou
 * colonnes propres n'avait d'autre choix que d'editer schema.ts directement -- le fichier
 * vendor partage. Un `apply-update` additif (rsync) ecrase alors integralement ce fichier des
 * deux cotes, effacant silencieusement les ajouts du derive a la prochaine synchronisation.
 *
 * Vide par defaut : n'affecte aucun projet qui ne l'utilise pas. Un derive y ajoute ses
 * PROPRES tables (jamais une redefinition d'une table vendor existante -- Drizzle ne fusionne
 * pas deux pgTable() du meme nom, voir doc NEOKUBE-578 pour le cas "ajouter une colonne a une
 * table vendor existante", qui necessite un tout autre mecanisme -- table compagnon).
 *
 * Fusionne automatiquement dans `db` (voir db/index.ts) et pris en compte par drizzle-kit
 * (voir drizzle.config.ts, schema: [...]).
 */
export {}
