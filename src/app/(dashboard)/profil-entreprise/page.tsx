"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Camera,
  Star,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Copy,
  MapPin,
  Building2,
  Users,
  Info,
  ExternalLink,
  MessageSquare,
  Phone,
  Mail,
  Globe,
  Loader2,
} from "lucide-react";
import { CoverageMap } from "@/components/dashboard/CoverageMap";
import { EditableTextField } from "@/components/shared/EditableField";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string;
  name: string;
  slug?: string;
  city: string;
  address?: string;
  postal_code?: string;
  rating: number;
  review_count: number;
  description: string;
  siret: string;
  legal_status: string;
  employee_count: string;
  logo_url?: string;
  phone?: string;
  email_contact?: string;
  website?: string;
  vat_number?: string | null;
  pending_name?: string | null;
  pending_name_requested_at?: string | null;
}

const PREDEFINED_QNA = [
  {
    question: "Quels types de déménagement proposez-vous ?",
    answer: "Nous proposons des déménagements nationaux, d'entreprise et internationaux. Que vous déménagiez un studio, une grande maison ou des locaux professionnels, nous adaptons nos solutions à vos besoins et à votre budget.",
  },
  {
    question: "Proposez-vous un service d'emballage ?",
    answer: "Oui, nous proposons un service complet d'emballage et de déballage. Nos équipes utilisent des matériaux de qualité pour protéger vos affaires : cartons renforcés, papier bulle, couvertures de déménagement et caisses à vaisselle.",
  },
  {
    question: "Effectuez-vous des déménagements le week-end ?",
    answer: "Oui, nous intervenons du lundi au samedi. Les déménagements le dimanche sont possibles sur demande et sous réserve de disponibilité. Contactez-nous pour vérifier nos créneaux.",
  },
  {
    question: "Quelle est votre zone d'intervention ?",
    answer: "Nous intervenons sur l'ensemble du territoire français. Pour les déménagements vers l'étranger, contactez-nous pour obtenir un devis personnalisé adapté à votre destination.",
  },
  {
    question: "Proposez-vous un service de garde-meuble ?",
    answer: "Oui, nous disposons d'espaces de stockage sécurisés disponibles à la semaine ou au mois. C'est idéal lors d'un entre-deux logements ou pour stocker des meubles encombrants.",
  },
  {
    question: "Comment se déroule un déménagement avec votre entreprise ?",
    answer: "Tout commence par un devis gratuit et sans engagement. Le jour J, nos déménageurs professionnels prennent en charge l'emballage, le chargement, le transport et la livraison dans votre nouveau domicile. Vous n'avez qu'à profiter de votre nouvelle installation.",
  },
  {
    question: "Vos déménageurs sont-ils assurés ?",
    answer: "Oui, tous nos déménageurs sont couverts par une assurance responsabilité civile professionnelle. Vos biens sont protégés de la prise en charge jusqu'à la livraison dans votre nouveau logement.",
  },
  {
    question: "Quel est le délai pour obtenir un devis ?",
    answer: "Vous recevez votre devis sous 24 à 48 heures après votre demande. Pour les déménagements urgents, nous faisons le maximum pour vous répondre dans les plus brefs délais.",
  },
  {
    question: "Prenez-vous en charge les objets lourds (piano, coffre-fort) ?",
    answer: "Oui, nous disposons du matériel spécialisé (monte-meubles, sangles renforcées, diable professionnel) pour déplacer en toute sécurité les objets encombrants et lourds : pianos, coffres-forts, grandes bibliothèques et électroménagers.",
  },
  {
    question: "Proposez-vous des déménagements internationaux ?",
    answer: "Oui, nous organisons des déménagements vers toute l'Europe et au-delà. Nous gérons les formalités douanières et le transport longue distance pour vous offrir un déménagement international serein et sans mauvaise surprise.",
  },
];

interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  created_at: string;
}

interface QnA {
  id: string;
  question: string;
  answer: string;
}

interface Photo {
  id: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilEntreprisePage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qna, setQna] = useState<QnA[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const [aboutText, setAboutText] = useState("");
  const [originalAbout, setOriginalAbout] = useState("");
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qnaAnswers, setQnaAnswers] = useState<Record<string, string>>({});
  const [editingQna, setEditingQna] = useState<string | null>(null);
  const [companyCoords, setCompanyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handleAddPredefinedQuestion(question: string, answer = "") {
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_qna", question, answer }),
      });
      if (res.ok) {
        toast.success("Question ajoutée !");
        setShowAddQuestion(false);
        fetchProfile();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } catch { toast.error("Erreur réseau"); }
  }

  async function handleDeleteQna(qnaId: string) {
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_qna", qnaId }),
      });
      if (res.ok) {
        toast.success("Question supprimée");
        fetchProfile();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch { toast.error("Erreur réseau"); }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_photo", photoId }),
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success("Photo supprimée");
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch { toast.error("Erreur réseau"); }
  }

  async function handleSaveQna(qnaId: string) {
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_qna", qnaId, answer: qnaAnswers[qnaId] || "" }),
      });
      if (res.ok) {
        toast.success("Réponse enregistrée !");
        setEditingQna(null);
        fetchProfile();
      } else {
        toast.error("Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
  }

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/profile");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement du profil");
      }
      const data = await res.json();
      setCompany(data.company);
      setReviews(data.reviews || []);
      setQna(data.qna || []);
      setPhotos(data.photos || []);
      setAboutText(data.company?.description || "");
      setOriginalAbout(data.company?.description || "");
      setQnaAnswers(
        Object.fromEntries(
          (data.qna || []).map((q: QnA) => [q.id, q.answer])
        )
      );

      // Geocode company address for the map
      const c = data.company;
      if (c && (c.address || c.city)) {
        const query = [c.address, c.postal_code, c.city].filter(Boolean).join(", ");
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (token && query) {
          try {
            const geoRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=fr&limit=1`
            );
            const geoData = await geoRes.json();
            if (geoData.features?.[0]?.center) {
              setCompanyCoords({
                lng: geoData.features[0].center[0],
                lat: geoData.features[0].center[1],
              });
            }
          } catch { /* ignore geocoding errors */ }
        }
      }
    } catch {
      toast.error("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveAbout = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aboutText }),
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }
      const updated = await res.json();
      setCompany((prev) => (prev ? { ...prev, description: updated.description } : prev));
      setOriginalAbout(aboutText);
      setIsEditingAbout(false);
      toast.success("Description mise à jour");
    } catch {
      toast.error("Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");
      const res = await fetch("/api/dashboard/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'upload");
      }
      const { url } = await res.json();
      setCompany((prev) => (prev ? { ...prev, logo_url: url } : prev));
      toast.success("Logo mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de télécharger le logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "photo");
      const res = await fetch("/api/dashboard/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'upload");
      }
      const { url } = await res.json();
      setPhotos((prev) => [...prev, { id: Date.now().toString(), url }]);
      toast.success("Photo ajoutée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de télécharger la photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-200"
        )}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Building2 className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Aucune entreprise trouvée.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold tracking-tight">
          Profil d&apos;entreprise
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez votre profil public visible par les clients.
        </p>
      </motion.div>

      {/* Company header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {/* Logo upload */}
              <div className="relative">
                {company.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-24 w-24 rounded-2xl border-2 border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-muted/50">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-green)] text-white shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold">{company.name}</h3>
                <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {company.city}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                  <div className="flex">{renderStars(company.rating || 0)}</div>
                  <span className="text-sm font-medium">
                    {company.rating?.toFixed(1) || "0.0"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({company.review_count || 0} avis)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* About section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">À propos</CardTitle>
            {!isEditingAbout ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingAbout(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={saving}
                  onClick={saveAbout}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAboutText(originalAbout);
                    setIsEditingAbout(false);
                  }}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditingAbout ? (
              <Textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={4}
              />
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {aboutText || "Aucune description. Cliquez sur le crayon pour en ajouter une."}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Project images */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Images des projets</CardTitle>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
            >
              {uploadingPhoto ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Ajouter des photos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.length > 0
                ? photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt="Photo projet"
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white hover:bg-red-600 group-hover:flex"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-muted/30"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reviews */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-[var(--brand-green)]" />
              Avis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Average rating */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="text-3xl font-bold">
                {company.rating?.toFixed(1) || "0.0"}
              </div>
              <div>
                <div className="flex">{renderStars(company.rating || 0)}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Basé sur {company.review_count || 0} avis
                </p>
              </div>
            </div>

            <Separator />

            {/* Review list */}
            {reviews.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun avis pour le moment.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(review.author_name || "?").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {review.author_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex">{renderStars(review.rating)}</div>
                    </div>
                    <p className="pl-10 text-sm text-muted-foreground">
                      {review.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Q&A */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-[var(--brand-green)]" />
              Questions / Réponses
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddQuestion(true)}>
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add question selector */}
            {showAddQuestion && (
              <div className="space-y-3 rounded-lg border border-green-200 bg-green-50/50 p-4">
                <p className="text-sm font-semibold">Sélectionnez une question :</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PREDEFINED_QNA
                    .filter(({ question }) => !qna.some(existing => existing.question === question))
                    .map(({ question, answer }) => (
                    <button
                      key={question}
                      onClick={() => handleAddPredefinedQuestion(question, answer)}
                      className="group rounded-lg border bg-white p-3 text-left transition-colors hover:border-green-300 hover:bg-green-50"
                    >
                      <p className="text-sm font-medium">{question}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground group-hover:text-green-700">
                        {answer}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ou saisissez votre propre question..."
                    className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                  />
                  <Button size="sm" onClick={() => { if (customQuestion.trim()) { handleAddPredefinedQuestion(customQuestion.trim()); setCustomQuestion(""); } }} disabled={!customQuestion.trim()}>
                    Ajouter
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAddQuestion(false)}>Fermer</Button>
              </div>
            )}

            {qna.length === 0 && !showAddQuestion ? (
              <div className="py-6 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">Aucune question pour le moment.</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setShowAddQuestion(true)}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter des questions
                </Button>
              </div>
            ) : (
              qna.map((item) => (
                <div key={item.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{item.question}</p>
                    <button
                      onClick={() => handleDeleteQna(item.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {editingQna === item.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={qnaAnswers[item.id] || ""}
                        onChange={(e) =>
                          setQnaAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        rows={3}
                        placeholder="Tapez votre réponse..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveQna(item.id)} className="gap-1">
                          <Check className="h-3.5 w-3.5" /> Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingQna(null)}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {qnaAnswers[item.id] || item.answer || <span className="italic">Cliquez pour répondre...</span>}
                      </p>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setEditingQna(item.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Map placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
              Localisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address info */}
            <div className="rounded-lg border bg-gray-50/50 p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-xs text-muted-foreground">Adresse</span>
                  <p className="font-medium">{company.address || "Non renseignée"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Code postal</span>
                  <p className="font-medium">{company.postal_code || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ville</span>
                  <p className="font-medium">{company.city || "—"}</p>
                </div>
              </div>
            </div>
            {/* Map */}
            <CoverageMap markers={companyCoords ? [{ lat: companyCoords.lat, lng: companyCoords.lng, label: [company.address, company.postal_code, company.city].filter(Boolean).join(", ") }] : []} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending name change request */}
      {company.pending_name && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="flex items-start gap-3 p-4">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Demande de changement de nom en attente
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Nouveau nom demandé : <strong>{company.pending_name}</strong>
                  {company.pending_name_requested_at && (
                    <> — soumise le {formatDate(company.pending_name_requested_at)}</>
                  )}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  En attente de validation par un administrateur.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Company info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-[var(--brand-green)]" />
              Infos entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">SIRET</p>
                <p className="mt-1 text-sm font-medium font-mono">{company.siret || "Non renseigné"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Statut juridique</p>
                <p className="mt-1 text-sm font-medium">{company.legal_status || "Non renseigné"}</p>
              </div>
              <EditableField
                label="Effectifs"
                value={company.employee_count || ""}
                icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
                options={[
                  { value: "1", label: "1 personne" },
                  { value: "3", label: "2-5 personnes" },
                  { value: "8", label: "6-10 personnes" },
                  { value: "18", label: "11-25 personnes" },
                  { value: "38", label: "26-50 personnes" },
                  { value: "75", label: "51-100 personnes" },
                  { value: "150", label: "Plus de 100 personnes" },
                ]}
                displayValue={(v: string) => {
                  const n = parseInt(v);
                  if (!n) return v;
                  if (n <= 1) return "1 personne";
                  if (n <= 5) return "2-5 personnes";
                  if (n <= 10) return "6-10 personnes";
                  if (n <= 25) return "11-25 personnes";
                  if (n <= 50) return "26-50 personnes";
                  if (n <= 100) return "51-100 personnes";
                  return "100+ personnes";
                }}
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employee_count: parseInt(val) }),
                  });
                  if (res.ok) { toast.success("Effectifs mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
              <EditableTextField
                label="Téléphone"
                value={company.phone || ""}
                icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="+33 6 12 34 56 78"
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: val }),
                  });
                  if (res.ok) { toast.success("Téléphone mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
              <EditableTextField
                label="Email de contact"
                value={company.email_contact || ""}
                icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="contact@votreentreprise.fr"
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email_contact: val }),
                  });
                  if (res.ok) { toast.success("Email mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
              <EditableTextField
                label="Site web"
                value={company.website || ""}
                icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="https://votreentreprise.fr"
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ website: val }),
                  });
                  if (res.ok) { toast.success("Site web mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile URL & info card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            const url = `${window.location.origin}/entreprises-demenagement/${company.slug || company.id}`;
            navigator.clipboard.writeText(url);
            toast.success("URL copiée !");
          }}
        >
          <Copy className="h-4 w-4" />
          Copier l&apos;URL du profil
        </Button>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={() => {
            window.open(
              `/entreprises-demenagement/${company.slug || company.id}`,
              "_blank"
            );
          }}
        >
          <ExternalLink className="h-4 w-4" />
          Voir le profil public
        </Button>
      </motion.div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Qui verra le profil public ?
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Votre profil est visible par tous les visiteurs du site qui
              recherchent un déménageur dans votre zone d&apos;intervention. Un
              profil complet avec des avis et des photos augmente
              considérablement vos chances d&apos;être contacté.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable field with dropdown
// ---------------------------------------------------------------------------
function EditableField({
  label,
  value,
  icon,
  options,
  displayValue,
  onSave,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  options: Array<{ value: string; label: string }>;
  displayValue?: (v: string) => string;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(selected);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 space-y-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-green)]"
          >
            <option value="">Sélectionnez...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              OK
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs">
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-medium">{value ? (displayValue ? displayValue(value) : value) : "Non renseigné"}</p>
        <button onClick={() => { setSelected(value); setEditing(true); }} className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
