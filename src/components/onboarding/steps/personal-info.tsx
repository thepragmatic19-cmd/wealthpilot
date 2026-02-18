"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { personalInfoSchema, type PersonalInfoInput } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Loader2, UserCircle } from "lucide-react";

interface Props {
  userId: string;
  onNext: () => void;
}

export function PersonalInfoStep({ userId, onNext }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PersonalInfoInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(personalInfoSchema) as any,
    defaultValues: {
      full_name: "",
      age: undefined,
      profession: "",
      family_situation: undefined,
      dependents: 0,
    },
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const [{ data: profile }, { data: clientInfo }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
        supabase.from("client_info").select("*").eq("user_id", userId).single(),
      ]);
      if (profile?.full_name) form.setValue("full_name", profile.full_name);
      if (clientInfo) {
        if (clientInfo.age) form.setValue("age", clientInfo.age);
        if (clientInfo.profession) form.setValue("profession", clientInfo.profession);
        if (clientInfo.family_situation) form.setValue("family_situation", clientInfo.family_situation as PersonalInfoInput["family_situation"]);
        if (clientInfo.dependents !== null) form.setValue("dependents", clientInfo.dependents);
      }
    }
    if (userId) loadData();
  }, [userId, form]);

  async function onSubmit(data: PersonalInfoInput) {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from("profiles").update({ full_name: data.full_name }).eq("id", userId);
      await supabase.from("client_info").upsert({
        user_id: userId,
        age: data.age,
        profession: data.profession,
        family_situation: data.family_situation,
        dependents: data.dependents,
      }, { onConflict: "user_id" });
      onNext();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <UserCircle className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Faisons connaissance! Ces informations nous aident à personnaliser nos recommandations.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean Dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Âge</FormLabel>
                    <FormControl>
                      <Input type="number" min={18} max={100} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingénieur logiciel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="family_situation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situation familiale</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="célibataire">Célibataire</SelectItem>
                        <SelectItem value="en_couple">En couple</SelectItem>
                        <SelectItem value="marié">Marié(e)</SelectItem>
                        <SelectItem value="divorcé">Divorcé(e)</SelectItem>
                        <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dependents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personnes à charge</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={20} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
