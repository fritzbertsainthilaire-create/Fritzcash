# FritzCash — Version Railway

## Fonctionnement
- Les clients créent un compte avec nom, téléphone et e-mail.
- Pour chaque demande, ils renseignent à nouveau leurs coordonnées, le montant, leur identifiant Meru / e-mail PayPal, le moyen de paiement, l'ID de transaction et la photo du reçu.
- Paiement manuel : NatCash **+509 5574 3483** ou MonCash **+509 3618 9702**.
- Recharge Meru : minimum **5 USD** (contrôlé dans le navigateur ET dans la base SQL).
- L'administrateur consulte les demandes et preuves, puis valide/refuse. Le solde interne est crédité uniquement lors d'une validation.
- Aucun débit ou transfert automatique vers Meru/PayPal n'est simulé.

## Déploiement Railway
1. Décompressez le ZIP et envoyez tous les fichiers dans un dépôt GitHub.
2. Railway > New Project > Deploy from GitHub Repo > sélectionnez le dépôt.
3. Railway détecte `package.json`, installe Express et lance `npm start`.
4. Le serveur écoute sur `process.env.PORT` et expose `/health`.
5. Dans Railway, ajoutez un domaine public (Settings > Networking > Generate Domain), puis éventuellement votre domaine personnalisé.
6. Le `railway.toml` configure Nixpacks, la commande de démarrage et le health check.

## Configurer Supabase
1. Créez un projet sur https://supabase.com/.
2. SQL Editor : exécutez `supabase/schema.sql`.
3. Project Settings > API : copiez Project URL et la clé anon/publishable dans `config.js`.
4. Authentication > URL Configuration : ajoutez l'URL Railway dans Site URL et Redirect URLs.
5. Dans Auth, configurez la confirmation e-mail selon vos besoins.
6. Créez votre compte client sur le site. Dans SQL Editor, donnez le rôle admin à votre e-mail :
   `update public.profiles set role='admin' where email='VOTRE_EMAIL';`

## Sécurité
- Ne publiez jamais `service_role`, mot de passe de base, clé privée ou secret PayPal dans GitHub ou dans `config.js`.
- La clé anon Supabase est publique et protégée par les politiques RLS; ne la confondez pas avec service_role.
- Gardez le bucket `payment-proofs` privé. Les administrateurs obtiennent des liens temporaires pour lire les preuves.
- Faites des tests avec de faux paiements avant d'accepter de l'argent réel.
- La fonction admin de validation est protégée côté SQL et ne peut traiter une demande qu'une seule fois.

## SEO
Meta title/description, canonical, Open Graph, JSON-LD, robots.txt et sitemap.xml sont fournis. Mettez à jour le domaine dans les fichiers SEO avant publication.

## Fichiers
`server.js` serveur Express Railway · `package.json` dépendances et start · `railway.toml` déploiement · `index.html` interface · `styles.css` design · `app.js` logique client/admin · `config.js` clés publiques Supabase · `supabase/schema.sql` tables, RLS, stockage, validation.
