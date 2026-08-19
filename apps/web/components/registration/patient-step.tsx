"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { Search, UserPlus, Phone, CalendarClock, Loader2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { ru, enUS, uz } from "date-fns/locale";

const DATE_FNS_LOCALE = { uz, ru, en: enUS };

export interface PatientResult {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  phone: string | null;
  notes?: string | null;
  queueEntries?: { registeredAt: string }[];
}

type NewPatientForm = {
  firstName: string;
  lastName: string;
  birthYear: number;
  phone?: string;
};

export function PatientStep({ onSelect }: { onSelect: (patient: PatientResult) => void }) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");
  const locale = useLocale() as keyof typeof DATE_FNS_LOCALE;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [duplicate, setDuplicate] = useState<PatientResult | null>(null);
  const [pendingValues, setPendingValues] = useState<NewPatientForm | null>(null);

  const newPatientSchema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t("firstName")),
        lastName: z.string().min(1, t("lastName")),
        birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
        phone: z.string().optional(),
      }),
    [t],
  );

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(() => {
      apiFetch<PatientResult[]>(`/patients/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setLoading(Boolean(value.trim()));
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPatientForm>({ resolver: zodResolver(newPatientSchema) });

  async function submitPatient(values: NewPatientForm, force = false) {
    try {
      const patient = await apiFetch<PatientResult>("/patients", {
        method: "POST",
        body: force ? { ...values, force: true } : values,
      });
      setDuplicate(null);
      onSelect(patient);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const existing = err.payload?.possibleDuplicate as PatientResult | undefined;
        if (existing) {
          setDuplicate(existing);
          setPendingValues(values);
          return;
        }
      }
      console.error(err instanceof ApiError ? err.message : err);
    }
  }

  if (duplicate && pendingValues) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TriangleAlert className="size-4 text-status-waiting" />
            {t("duplicateTitle")}
          </CardTitle>
          <CardDescription>{t("duplicateDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border p-4">
            <p className="font-medium">
              {duplicate.lastName} {duplicate.firstName}{" "}
              <span className="font-normal text-muted-foreground">{duplicate.birthYear}</span>
            </p>
            {duplicate.phone && <p className="text-sm text-muted-foreground">{duplicate.phone}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSelect(duplicate)}>{t("useDuplicate")}</Button>
            <Button variant="outline" onClick={() => submitPatient(pendingValues, true)}>
              {t("createNewAnyway")}
            </Button>
            <Button variant="ghost" onClick={() => setDuplicate(null)}>
              {tCommon("cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showNewForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("newPatientTitle")}</CardTitle>
          <CardDescription>{t("newPatientDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => submitPatient(values))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label>{t("firstName")}</Label>
              <Input autoFocus {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("lastName")}</Label>
              <Input {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("birthYear")}</Label>
              <Input
                inputMode="numeric"
                placeholder="1998"
                {...register("birthYear", { valueAsNumber: true })}
              />
              {errors.birthYear && (
                <p className="text-xs text-destructive">{errors.birthYear.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("phoneOptional")}</Label>
              <Input placeholder="+998 90 123 45 67" {...register("phone")} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {t("registerAndContinue")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)}>
                {t("backToSearch")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("findPatientTitle")}</CardTitle>
        <CardDescription>{t("findPatientDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-12 rounded-full pl-10 text-base"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {query.trim() && !loading && (
          <div className="divide-y rounded-xl border">
            {results.map((p) => {
              const lastVisit = p.queueEntries?.[0]?.registeredAt;
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(p);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {p.lastName} {p.firstName}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {p.birthYear}
                      </span>
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {lastVisit && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="size-3.5" />
                          {t("lastVisit", {
                            time: formatDistanceToNow(new Date(lastVisit), {
                              addSuffix: true,
                              locale: DATE_FNS_LOCALE[locale],
                            }),
                          })}
                        </span>
                      )}
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5" />
                          {p.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(p);
                    }}
                  >
                    {t("select")}
                  </Button>
                </div>
              );
            })}
            {results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowNewForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-primary transition-colors hover:bg-accent"
        >
          <UserPlus className="size-4" />
          {t("registerNewPatient")}
        </button>
      </CardContent>
    </Card>
  );
}
