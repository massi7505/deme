"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, CheckCircle2 } from "lucide-react";
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
import toast from "react-hot-toast";

const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  subject: z.string().min(1, "Veuillez sélectionner un sujet"),
  message: z
    .string()
    .min(10, "Le message doit contenir au moins 10 caractères"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
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
        const result = await res.json().catch(() => ({}));
        toast.error(result.error || "Erreur lors de l'envoi du message");
        return;
      }

      setSubmitted(true);
      toast.success("Message envoyé avec succès !");
    } catch {
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-green-50 p-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="mt-6 font-display text-2xl font-bold text-gray-950">
          Message envoyé !
        </h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          Merci pour votre message. Notre équipe vous répondra dans les plus
          brefs délais, généralement sous 24 h ouvrables.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

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
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

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
          <SelectTrigger className={cn(errors.subject && "border-red-500")}>
            <SelectValue placeholder="Sélectionnez un sujet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="question-generale">Question générale</SelectItem>
            <SelectItem value="support-technique">Support technique</SelectItem>
            <SelectItem value="partenariat">Partenariat</SelectItem>
            <SelectItem value="reclamation">Réclamation</SelectItem>
          </SelectContent>
        </Select>
        {errors.subject && (
          <p className="text-sm text-red-500">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          Message <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="message"
          placeholder="Décrivez votre demande..."
          rows={6}
          {...register("message")}
          className={cn(errors.message && "border-red-500")}
        />
        {errors.message && (
          <p className="text-sm text-red-500">{errors.message.message}</p>
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
  );
}
