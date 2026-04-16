"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/use-site-settings";
import toast from "react-hot-toast";

const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  email: z.string().email("Adresse email invalide"),
  subject: z.string().min(1, "Veuillez selectionner un sujet"),
  message: z
    .string()
    .min(10, "Le message doit contenir au moins 10 caracteres"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ContactPage() {
  const { contactAddress, contactPhone, contactEmail } = useSiteSettings();

  const contactInfo = [
    {
      icon: MapPin,
      label: "Adresse",
      value: contactAddress,
    },
    {
      icon: Phone,
      label: "Téléphone",
      value: contactPhone,
    },
    {
      icon: Mail,
      label: "Email",
      value: contactEmail,
    },
    {
      icon: Clock,
      label: "Horaires",
      value: "Lun-Ven : 9h-18h | Sam : 9h-13h",
    },
  ];
  const [submitted, setSubmitted] = useState(false);
  const [subjectValue, setSubjectValue] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error || "Erreur lors de l'envoi du message");
        return;
      }

      setSubmitted(true);
      toast.success("Message envoyé avec succès !");
    } catch {
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-2xl text-center"
          >
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Contactez-nous
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mt-4 text-lg text-muted-foreground"
            >
              Une question, un partenariat ou besoin d&apos;aide ? Notre equipe
              est a votre ecoute.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="container pb-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <div>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center rounded-2xl border bg-green-50 p-12 text-center"
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h2 className="mt-6 font-display text-2xl font-bold text-gray-950">
                  Message envoye !
                </h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Merci pour votre message. Notre equipe vous repondra dans les
                  plus brefs delais, generalement sous 24h ouvrables.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nom complet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Votre nom"
                    {...register("name")}
                    className={cn(errors.name && "border-red-500")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.fr"
                    {...register("email")}
                    className={cn(errors.email && "border-red-500")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label>
                    Sujet <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={subjectValue}
                    onValueChange={(val) => {
                      setSubjectValue(val);
                      setValue("subject", val, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger
                      className={cn(errors.subject && "border-red-500")}
                    >
                      <SelectValue placeholder="Selectionnez un sujet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question-generale">
                        Question generale
                      </SelectItem>
                      <SelectItem value="support-technique">
                        Support technique
                      </SelectItem>
                      <SelectItem value="partenariat">Partenariat</SelectItem>
                      <SelectItem value="reclamation">Reclamation</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.subject && (
                    <p className="text-sm text-red-500">
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Decrivez votre demande..."
                    rows={6}
                    {...register("message")}
                    className={cn(errors.message && "border-red-500")}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                </Button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-gray-50/50 p-6">
              <h3 className="font-display text-lg font-bold text-gray-950">
                Nos coordonnees
              </h3>
              <div className="mt-6 space-y-5">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-green-50/50 p-6">
              <h3 className="font-display text-base font-bold text-gray-950">
                Reponse rapide
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Notre equipe repond generalement sous 24h ouvrables. Pour les
                demandes urgentes, privilegiez le telephone.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
