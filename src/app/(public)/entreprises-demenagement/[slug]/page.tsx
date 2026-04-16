"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star, CheckCircle2, MapPin, Globe, Copy, ArrowRight, Building2,
  Users, ChevronRight, MessageSquare, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, REGION_SLUGS } from "@/lib/utils";
import RegionPage from "@/components/public/RegionPage";

interface Company {
  id: string; name: string; slug: string; city: string | null; postal_code: string | null;
  logo_url: string | null; description: string | null;
  rating: number; review_count: number; is_verified: boolean;
  employee_count: number | null; legal_status: string | null; siret: string;
  website: string | null;
  company_regions: Array<{ department_name: string; categories: string[] }>;
  company_photos: Array<{ id: string; url: string; caption: string | null }>;
  company_qna: Array<{ id: string; question: string; answer: string }>;
  reviews: Array<{ id: string; rating: number; comment: string | null; reviewer_name: string | null; is_anonymous: boolean; created_at: string }>;
}

const COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-500", "bg-teal-600", "bg-red-500"];
function getColor(name: string) { let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; }
function getInitials(name: string) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

export default function MoverProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  // If slug matches a region, render the region page
  if (REGION_SLUGS[slug]) {
    return <RegionPage regionSlug={slug} regionName={REGION_SLUGS[slug]} />;
  }

  return <CompanyProfilePage slug={slug} />;
}

function CompanyProfilePage({ slug }: { slug: string }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/public/movers/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setCompany)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-green)]" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container py-20 text-center">
        <Building2 className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h1 className="mt-4 text-2xl font-bold">Entreprise non trouvée</h1>
        <p className="mt-2 text-muted-foreground">Cette entreprise n&apos;existe pas ou n&apos;est plus disponible.</p>
        <Link href="/entreprises-demenagement" className="mt-6 inline-block rounded-lg bg-brand-gradient px-6 py-2.5 text-sm font-bold text-white">
          Voir tous les déménageurs
        </Link>
      </div>
    );
  }

  const handleCopyUrl = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const categories = Array.from(new Set(company.company_regions?.flatMap(r => r.categories) || []));
  const avgRating = company.reviews.length > 0 ? (company.reviews.reduce((s, r) => s + r.rating, 0) / company.reviews.length).toFixed(1) : Number(company.rating).toFixed(1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: company.city || undefined,
      postalCode: company.postal_code || undefined,
      addressCountry: "FR",
    },
    aggregateRating: company.review_count > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: avgRating,
          reviewCount: company.review_count,
          bestRating: 10,
        }
      : undefined,
    url: company.website || `https://demenagement24.fr/entreprises-demenagement/${company.slug}`,
    review: company.reviews.map((review) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 10,
      },
      author: {
        "@type": "Person",
        name: review.is_anonymous ? "Client anonyme" : (review.reviewer_name || "Client"),
      },
      datePublished: review.created_at,
      ...(review.comment ? { reviewBody: review.comment } : {}),
    })),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="border-b bg-gray-50/50">
        <div className="container flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/entreprises-demenagement" className="hover:text-foreground">Déménageurs</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{company.name}</span>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-5">
              {company.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={company.logo_url} alt={company.name} className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white", getColor(company.name))}>
                  {getInitials(company.name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold">{company.name}</h1>
                  {company.is_verified && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{company.postal_code ? `${company.postal_code} ` : ""}{company.city || "France"}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5">
                    <Star className="h-5 w-5 fill-green-500 text-green-500" />
                    <span className="text-lg font-bold text-green-700">{avgRating}</span>
                    <span className="text-sm text-green-600">/10</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{company.review_count} avis</span>
                </div>
                {categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {categories.map(c => (
                      <Badge key={c} variant="outline" className="capitalize">{c}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            <Separator />

            {/* Description */}
            {company.description && (
              <section>
                <h2 className="font-display text-xl font-bold">À propos</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{company.description}</p>
              </section>
            )}

            {/* Photos */}
            {company.company_photos.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold">Galerie photos</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {company.company_photos.map((photo) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={photo.id} src={photo.url} alt={photo.caption || ""} className="aspect-video rounded-xl object-cover" />
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section>
              <h2 className="font-display text-xl font-bold">Avis clients ({company.reviews.length})</h2>
              {company.reviews.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Aucun avis pour le moment.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {company.reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded bg-green-50 px-2 py-0.5">
                              <Star className="h-3.5 w-3.5 fill-green-500 text-green-500" />
                              <span className="text-sm font-bold text-green-700">{review.rating}/10</span>
                            </div>
                            <span className="text-sm font-medium">{review.is_anonymous ? "Client anonyme" : review.reviewer_name || "Client"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                        </div>
                        {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Q&A */}
            {company.company_qna.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold">Questions & Réponses</h2>
                <Accordion type="single" collapsible className="mt-4">
                  {company.company_qna.map((qna) => (
                    <AccordionItem key={qna.id} value={qna.id}>
                      <AccordionTrigger className="text-left text-sm font-medium">
                        <MessageSquare className="mr-2 h-4 w-4 shrink-0 text-[var(--brand-green)]" />
                        {qna.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{qna.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* Legal info */}
            <section>
              <h2 className="font-display text-xl font-bold">Informations légales</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">SIRET</p>
                    <p className="font-mono text-sm font-medium">{company.siret}</p>
                  </CardContent>
                </Card>
                {company.legal_status && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Statut juridique</p>
                      <p className="text-sm font-medium">{company.legal_status}</p>
                    </CardContent>
                  </Card>
                )}
                {company.employee_count && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Effectif</p>
                      <p className="text-sm font-medium">{company.employee_count} salariés</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* CTA */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-6 text-center">
                <h3 className="font-display text-lg font-bold">Demander un devis gratuit</h3>
                <p className="mt-1 text-sm text-muted-foreground">Recevez une proposition personnalisée</p>
                <Link href="/devis" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110">
                  Demander un devis <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {company.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                    {company.postal_code ? `${company.postal_code} ` : ""}{company.city}
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4 text-[var(--brand-green)]" />
                    {company.website}
                  </div>
                )}
                {company.employee_count && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-[var(--brand-green)]" />
                    {company.employee_count} salariés
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Copy URL */}
            <Button variant="outline" className="w-full gap-2" onClick={handleCopyUrl}>
              <Copy className="h-4 w-4" />
              {copied ? "Lien copié !" : "Copier l'URL du profil"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
