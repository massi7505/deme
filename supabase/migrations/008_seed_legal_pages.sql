-- 008_seed_legal_pages.sql
-- Seed the 4 standard French legal pages. Admins can then edit them
-- via /admin/pages. ON CONFLICT DO NOTHING preserves admin changes
-- if the migration is replayed.

INSERT INTO pages (slug, title, content, meta_title, meta_description)
VALUES
  (
    'mentions-legales',
    'Mentions légales',
    $$<h2>Éditeur du site</h2>
<p>Le présent site est édité par <strong>[Nom de l'entité légale]</strong>, société [forme juridique] au capital de [montant] euros.</p>
<ul>
  <li><strong>Siège social :</strong> [Adresse postale]</li>
  <li><strong>SIRET :</strong> [Numéro SIRET]</li>
  <li><strong>RCS :</strong> [Ville et numéro RCS]</li>
  <li><strong>Numéro de TVA intracommunautaire :</strong> [FR XX XXXXXXXXX]</li>
  <li><strong>Téléphone :</strong> [Numéro]</li>
  <li><strong>Email :</strong> [Email de contact]</li>
</ul>

<h2>Directeur de la publication</h2>
<p>[Nom et prénom du représentant légal], en qualité de [fonction].</p>

<h2>Hébergeur</h2>
<p>Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Site : <a href="https://vercel.com" target="_blank" rel="noopener">vercel.com</a>.</p>

<h2>Propriété intellectuelle</h2>
<p>L'ensemble des éléments présents sur le site (textes, images, logos, marques, graphismes, vidéos, sons, bases de données) est protégé par le droit d'auteur et/ou le droit des marques. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable de l'éditeur est interdite et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.</p>

<h2>Données personnelles</h2>
<p>Le traitement de vos données personnelles est détaillé dans notre <a href="/politique-confidentialite">Politique de confidentialité</a>. Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation sur vos données. Pour exercer ces droits, contactez-nous à l'adresse [Email DPO].</p>

<h2>Cookies</h2>
<p>Le site utilise des cookies techniques indispensables à son fonctionnement et, sous réserve de votre consentement, des cookies de mesure d'audience. Vous pouvez à tout moment modifier vos préférences via les paramètres de votre navigateur.</p>

<h2>Loi applicable et juridiction</h2>
<p>Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</p>
$$,
    'Mentions légales',
    'Informations légales obligatoires concernant l''éditeur, l''hébergeur et les conditions d''utilisation de notre plateforme.'
  ),

  (
    'politique-confidentialite',
    'Politique de confidentialité',
    $$<h2>Préambule</h2>
<p>La présente Politique de confidentialité décrit comment [Nom de l'entité légale] (ci-après « <strong>nous</strong> ») collecte, utilise et protège vos données à caractère personnel lorsque vous utilisez notre plateforme de mise en relation entre particuliers / entreprises et déménageurs professionnels.</p>
<p>Nous nous engageons à respecter le Règlement (UE) 2016/679 (RGPD) et la loi n°78-17 du 6 janvier 1978 modifiée (loi Informatique et Libertés).</p>

<h2>Responsable du traitement</h2>
<p>Le responsable du traitement est <strong>[Nom de l'entité légale]</strong>, [adresse], contact : [Email DPO].</p>

<h2>Données collectées</h2>
<p>Selon votre utilisation du service, nous pouvons collecter :</p>
<ul>
  <li><strong>Données d'identification :</strong> nom, prénom, civilité, email, numéro de téléphone.</li>
  <li><strong>Données relatives au déménagement :</strong> adresses de départ et d'arrivée, type de logement, volume, date souhaitée, commentaires.</li>
  <li><strong>Données professionnelles</strong> (déménageurs) : raison sociale, SIRET, adresse, zone d'intervention, pièces justificatives.</li>
  <li><strong>Données de paiement :</strong> nous ne stockons pas les numéros de carte ; ils sont traités par notre prestataire Mollie.</li>
  <li><strong>Données de navigation :</strong> adresse IP, identifiants de session, pages consultées, type de navigateur.</li>
</ul>

<h2>Finalités et base légale</h2>
<table>
  <thead>
    <tr><th>Finalité</th><th>Base légale</th></tr>
  </thead>
  <tbody>
    <tr><td>Mise en relation avec des déménageurs</td><td>Exécution du contrat</td></tr>
    <tr><td>Gestion de votre compte</td><td>Exécution du contrat</td></tr>
    <tr><td>Facturation et paiements</td><td>Obligation légale</td></tr>
    <tr><td>Amélioration du service et analytics</td><td>Intérêt légitime</td></tr>
    <tr><td>Communications marketing</td><td>Consentement (opt-in)</td></tr>
    <tr><td>Lutte contre la fraude</td><td>Intérêt légitime</td></tr>
  </tbody>
</table>

<h2>Destinataires des données</h2>
<p>Vos données sont partagées uniquement avec :</p>
<ul>
  <li>Les <strong>déménageurs partenaires</strong> correspondant à votre demande (nom, contact, adresses) une fois la mise en relation effectuée.</li>
  <li>Nos <strong>prestataires techniques</strong> : Supabase (hébergement base de données, UE), Vercel (hébergement web), Resend (email), SMSFactor (SMS), Mollie (paiement), Mapbox (cartographie), SumSub (vérification d'identité).</li>
  <li>Les <strong>autorités administratives ou judiciaires</strong> sur réquisition légale.</li>
</ul>

<h2>Transferts hors Union européenne</h2>
<p>Certains prestataires (Vercel, Mapbox) peuvent traiter des données aux États-Unis. Ces transferts reposent sur les clauses contractuelles types adoptées par la Commission européenne ou, le cas échéant, sur le Data Privacy Framework.</p>

<h2>Durée de conservation</h2>
<ul>
  <li>Compte utilisateur actif : durée d'utilisation du service + 3 ans en base active.</li>
  <li>Demandes de devis : 3 ans à compter de la dernière activité.</li>
  <li>Factures et pièces comptables : 10 ans (obligation légale).</li>
  <li>Cookies de mesure : 13 mois maximum.</li>
</ul>

<h2>Vos droits</h2>
<p>Conformément au RGPD, vous disposez des droits suivants :</p>
<ul>
  <li>Droit d'accès, de rectification et d'effacement</li>
  <li>Droit à la limitation du traitement</li>
  <li>Droit à la portabilité</li>
  <li>Droit d'opposition</li>
  <li>Droit de retirer votre consentement à tout moment</li>
  <li>Droit d'introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>)</li>
</ul>
<p>Pour exercer ces droits, écrivez-nous à <strong>[Email DPO]</strong>. Nous répondrons sous 30 jours.</p>

<h2>Cookies</h2>
<p>Nous utilisons des cookies strictement nécessaires au fonctionnement du site (authentification, préférences). Les cookies de mesure d'audience ne sont déposés qu'avec votre consentement recueilli via le bandeau cookies.</p>

<h2>Modifications</h2>
<p>Nous pouvons mettre à jour cette politique. En cas de modification substantielle, nous vous en informerons par email ou via une notification sur le site.</p>
$$,
    'Politique de confidentialité',
    'Comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD.'
  ),

  (
    'cgu',
    'Conditions Générales d''Utilisation',
    $$<h2>Article 1 — Objet</h2>
<p>Les présentes Conditions Générales d'Utilisation (ci-après « <strong>CGU</strong> ») ont pour objet de définir les modalités et conditions d'utilisation de la plateforme accessible à l'adresse du site (ci-après la « <strong>Plateforme</strong> »), éditée par [Nom de l'entité légale].</p>
<p>La Plateforme met en relation des particuliers et des entreprises à la recherche de services de déménagement (« <strong>Clients</strong> ») avec des déménageurs professionnels (« <strong>Partenaires</strong> »).</p>

<h2>Article 2 — Acceptation des CGU</h2>
<p>L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces CGU, vous devez cesser d'utiliser la Plateforme.</p>

<h2>Article 3 — Description du service</h2>
<p>Le service proposé est un service gratuit de demande de devis pour les Clients. Les demandes sont transmises à un maximum de 6 Partenaires sélectionnés selon des critères géographiques et professionnels. Les Partenaires peuvent acheter l'accès aux coordonnées des Clients.</p>

<h2>Article 4 — Inscription et compte utilisateur</h2>
<p>L'inscription d'un Partenaire nécessite la communication d'informations exactes et la vérification de son identité (KYC) via notre prestataire SumSub. Le Partenaire s'engage à tenir à jour les informations de son compte.</p>
<p>Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion.</p>

<h2>Article 5 — Obligations des Clients</h2>
<ul>
  <li>Fournir des informations exactes et sincères dans la demande de devis.</li>
  <li>Ne pas utiliser la Plateforme à des fins frauduleuses ou contraires à l'ordre public.</li>
  <li>Respecter les Partenaires qui les contactent.</li>
</ul>

<h2>Article 6 — Obligations des Partenaires</h2>
<ul>
  <li>Être titulaire d'une inscription au Registre du Commerce et des Sociétés et disposer des autorisations nécessaires à l'exercice de l'activité de déménageur.</li>
  <li>Disposer d'une assurance responsabilité civile professionnelle en cours de validité.</li>
  <li>Respecter les informations fournies lors de l'inscription et celles relatives aux Clients contactés.</li>
  <li>Ne pas détourner les coordonnées des Clients à d'autres fins que la réalisation d'un devis ou d'un déménagement.</li>
  <li>Respecter les tarifs communiqués aux Clients.</li>
</ul>

<h2>Article 7 — Contenus</h2>
<p>Les utilisateurs s'engagent à ne pas publier de contenus illicites, diffamatoires, injurieux, menaçants ou portant atteinte aux droits de tiers. L'éditeur se réserve le droit de supprimer tout contenu contraire aux présentes CGU.</p>

<h2>Article 8 — Propriété intellectuelle</h2>
<p>La marque, le logo, l'interface, les textes et les bases de données de la Plateforme sont la propriété exclusive de l'éditeur. Toute reproduction ou exploitation non autorisée est interdite.</p>

<h2>Article 9 — Responsabilité</h2>
<p>L'éditeur agit uniquement en qualité d'intermédiaire technique. Il n'est pas partie au contrat de déménagement conclu entre le Client et le Partenaire. Il ne saurait être tenu responsable des prestations réalisées par les Partenaires.</p>
<p>L'éditeur met tout en œuvre pour assurer la disponibilité de la Plateforme mais ne garantit pas un accès ininterrompu. Des interruptions pour maintenance peuvent avoir lieu.</p>

<h2>Article 10 — Données personnelles</h2>
<p>Le traitement des données personnelles est détaillé dans notre <a href="/politique-confidentialite">Politique de confidentialité</a>.</p>

<h2>Article 11 — Résiliation</h2>
<p>L'utilisateur peut à tout moment supprimer son compte depuis son espace personnel. L'éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de manquement grave aux présentes CGU.</p>

<h2>Article 12 — Modification des CGU</h2>
<p>L'éditeur peut modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par email ou notification sur la Plateforme.</p>

<h2>Article 13 — Droit applicable et litiges</h2>
<p>Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux juridictions françaises compétentes. Avant tout recours judiciaire, les parties s'efforceront de résoudre amiablement leur différend.</p>
$$,
    'Conditions Générales d''Utilisation',
    'Conditions d''utilisation de la plateforme : inscription, obligations, propriété intellectuelle, responsabilité.'
  ),

  (
    'cgv',
    'Conditions Générales de Vente',
    $$<h2>Article 1 — Objet</h2>
<p>Les présentes Conditions Générales de Vente (ci-après « <strong>CGV</strong> ») régissent la vente des services payants proposés par [Nom de l'entité légale] (ci-après « <strong>l'Éditeur</strong> ») aux déménageurs professionnels (ci-après « <strong>le Client Pro</strong> ») via la Plateforme.</p>

<h2>Article 2 — Services proposés</h2>
<p>L'Éditeur propose au Client Pro l'accès aux coordonnées complètes (nom, téléphone, email, adresses) de prospects ayant soumis une demande de devis de déménagement sur la Plateforme (ci-après le « <strong>Lead</strong> »).</p>
<p>Chaque Lead peut être acheté par un maximum de 6 déménageurs. Au-delà, le Lead n'est plus disponible.</p>

<h2>Article 3 — Tarifs</h2>
<p>Les tarifs de chaque Lead sont indiqués toutes taxes comprises (TTC) sur la Plateforme, au moment de l'achat. Les tarifs peuvent varier selon la catégorie (national, entreprise, international), le département géographique, le volume et la saison, conformément à la grille tarifaire visible dans l'espace déménageur.</p>
<p>L'Éditeur se réserve le droit de modifier ses tarifs à tout moment, étant entendu que les tarifs applicables sont ceux affichés au moment de l'achat du Lead.</p>

<h2>Article 4 — Modalités de paiement</h2>
<p>Le paiement s'effectue en ligne par carte bancaire via notre prestataire agréé <strong>Mollie B.V.</strong>. Le Client Pro garantit qu'il dispose des autorisations nécessaires pour utiliser le moyen de paiement choisi.</p>
<p>Le Lead est mis à disposition immédiatement après confirmation du paiement.</p>

<h2>Article 5 — Facturation</h2>
<p>Une facture est automatiquement générée et mise à disposition du Client Pro dans son espace de facturation après chaque paiement confirmé.</p>

<h2>Article 6 — Droit de rétractation</h2>
<p>Conformément à l'article L.221-28 du Code de la consommation, et en tant que professionnel (B2B), le Client Pro <strong>ne bénéficie pas du droit de rétractation</strong> de 14 jours. Par ailleurs, le service étant exécuté immédiatement (accès au Lead), le droit de rétractation ne pourrait s'appliquer.</p>

<h2>Article 7 — Réclamations et remboursements</h2>
<p>Le Client Pro peut introduire une réclamation via l'espace <strong>Réclamations</strong> de son compte, dans un délai de <strong>7 jours</strong> à compter de l'achat du Lead, dans les cas suivants :</p>
<ul>
  <li><strong>Numéro invalide</strong> : le numéro communiqué n'est pas joignable après trois tentatives espacées de 24 h.</li>
  <li><strong>Fausse demande</strong> : le prospect nie avoir fait une demande de devis.</li>
  <li><strong>Doublon</strong> : le Lead a déjà été acheté par erreur sur un autre compte.</li>
  <li><strong>Client déjà déménagé</strong> : le déménagement est intervenu avant l'achat du Lead.</li>
</ul>
<p>Après instruction (48 h ouvrées), l'Éditeur peut, à sa discrétion :</p>
<ul>
  <li>Rembourser le Lead sous 10 jours ouvrés sur le moyen de paiement d'origine.</li>
  <li>Créditer le compte du Client Pro d'un Lead de remplacement.</li>
  <li>Rejeter la réclamation si les conditions ne sont pas remplies.</li>
</ul>

<h2>Article 8 — Obligations du Client Pro</h2>
<ul>
  <li>Contacter le prospect dans un délai raisonnable (recommandé sous 8 h).</li>
  <li>Établir un devis conforme aux informations communiquées.</li>
  <li>Ne pas céder, revendre ou communiquer les coordonnées du prospect à un tiers.</li>
  <li>Respecter la réglementation applicable à l'activité de déménageur.</li>
</ul>

<h2>Article 9 — Responsabilité</h2>
<p>L'Éditeur fournit un service de mise en relation. Il ne peut être tenu responsable :</p>
<ul>
  <li>De la réalisation effective du contrat de déménagement entre le Client Pro et le prospect.</li>
  <li>De la qualité des prestations fournies par le Client Pro.</li>
  <li>Des litiges nés entre le Client Pro et le prospect.</li>
</ul>
<p>En tout état de cause, la responsabilité de l'Éditeur ne saurait excéder le montant du Lead concerné.</p>

<h2>Article 10 — Force majeure</h2>
<p>L'Éditeur ne saurait être tenu responsable en cas de force majeure (pannes techniques majeures, interruption des services tiers, cyberattaque, événement gouvernemental) rendant temporairement impossible l'exécution du service.</p>

<h2>Article 11 — Protection des données</h2>
<p>Le traitement des données personnelles est détaillé dans notre <a href="/politique-confidentialite">Politique de confidentialité</a>.</p>

<h2>Article 12 — Droit applicable et litiges</h2>
<p>Les présentes CGV sont régies par le droit français. Tout litige sera soumis à la compétence exclusive des tribunaux français. Conformément à l'article L.612-1 du Code de la consommation, le Client Pro ne bénéficie pas du médiateur de la consommation (relation B2B).</p>
$$,
    'Conditions Générales de Vente',
    'Conditions commerciales de vente des leads aux déménageurs professionnels : tarifs, paiement, réclamations, remboursements.'
  )
ON CONFLICT (slug) DO NOTHING;
