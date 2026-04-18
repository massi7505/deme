/**
 * Shared source of truth for the Q&A suggestions offered to movers in
 * /profil-entreprise. Used both by the dashboard UI (to offer suggestions)
 * and by the profile API (to auto-backfill empty answers when the question
 * matches one of ours — fixes historical rows that were inserted with an
 * empty answer).
 */
export const PREDEFINED_QNA: Array<{ question: string; answer: string }> = [
  {
    question: "Quels types de déménagement proposez-vous ?",
    answer:
      "Nous proposons des déménagements nationaux, d'entreprise et internationaux. Que vous déménagiez un studio, une grande maison ou des locaux professionnels, nous adaptons nos solutions à vos besoins et à votre budget.",
  },
  {
    question: "Proposez-vous un service d'emballage ?",
    answer:
      "Oui, nous proposons un service complet d'emballage et de déballage. Nos équipes utilisent des matériaux de qualité pour protéger vos affaires : cartons renforcés, papier bulle, couvertures de déménagement et caisses à vaisselle.",
  },
  {
    question: "Effectuez-vous des déménagements le week-end ?",
    answer:
      "Oui, nous intervenons du lundi au samedi. Les déménagements le dimanche sont possibles sur demande et sous réserve de disponibilité. Contactez-nous pour vérifier nos créneaux.",
  },
  {
    question: "Quelle est votre zone d'intervention ?",
    answer:
      "Nous intervenons sur l'ensemble du territoire français. Pour les déménagements vers l'étranger, contactez-nous pour obtenir un devis personnalisé adapté à votre destination.",
  },
  {
    question: "Proposez-vous un service de garde-meuble ?",
    answer:
      "Oui, nous disposons d'espaces de stockage sécurisés disponibles à la semaine ou au mois. C'est idéal lors d'un entre-deux logements ou pour stocker des meubles encombrants.",
  },
  {
    question: "Comment se déroule un déménagement avec votre entreprise ?",
    answer:
      "Tout commence par un devis gratuit et sans engagement. Le jour J, nos déménageurs professionnels prennent en charge l'emballage, le chargement, le transport et la livraison dans votre nouveau domicile. Vous n'avez qu'à profiter de votre nouvelle installation.",
  },
  {
    question: "Vos déménageurs sont-ils assurés ?",
    answer:
      "Oui, tous nos déménageurs sont couverts par une assurance responsabilité civile professionnelle. Vos biens sont protégés de la prise en charge jusqu'à la livraison dans votre nouveau logement.",
  },
  {
    question: "Quel est le délai pour obtenir un devis ?",
    answer:
      "Vous recevez votre devis sous 24 à 48 heures après votre demande. Pour les déménagements urgents, nous faisons le maximum pour vous répondre dans les plus brefs délais.",
  },
  {
    question: "Prenez-vous en charge les objets lourds (piano, coffre-fort) ?",
    answer:
      "Oui, nous disposons du matériel spécialisé (monte-meubles, sangles renforcées, diable professionnel) pour déplacer en toute sécurité les objets encombrants et lourds : pianos, coffres-forts, grandes bibliothèques et électroménagers.",
  },
  {
    question: "Proposez-vous des déménagements internationaux ?",
    answer:
      "Oui, nous organisons des déménagements vers toute l'Europe et au-delà. Nous gérons les formalités douanières et le transport longue distance pour vous offrir un déménagement international serein et sans mauvaise surprise.",
  },
];

/**
 * Lookup by question. Used by the backfill path to pair a row's stored
 * question string with our canonical answer. Matching is exact on the
 * trimmed question — keep the question strings in sync with the UI.
 */
export function findPredefinedAnswer(question: string): string | null {
  const trimmed = question.trim();
  const match = PREDEFINED_QNA.find((q) => q.question.trim() === trimmed);
  return match ? match.answer : null;
}
