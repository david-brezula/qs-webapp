"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/portal/FormField";
import { FormSelect } from "@/components/portal/FormSelect";
import { updateWorkerAction, resetPasswordAction } from "@/lib/actions/workers";

export function EditWorkerForm({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string | null;
    role: "ADMIN" | "WORKER";
    language: "EN" | "SK";
    active: boolean;
    defaultPriceTie: number;
    defaultPriceConnect: number;
  };
}) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("userId", user.id);
    start(async () => {
      const r = await updateWorkerAction(fd);
      if (r.ok) router.refresh();
      else setErrors(r.fieldErrors ?? {});
    });
  }

  function onResetPassword() {
    const fd = new FormData();
    fd.set("userId", user.id);
    start(async () => {
      const r = await resetPasswordAction(fd);
      if (r.ok && r.data) setTempPassword(r.data.tempPassword);
    });
  }

  return (
    <>
      <form onSubmit={onSave} className="space-y-5" noValidate>
        <FormField label={tCommon("name")} name="name" defaultValue={user.name} required error={errors.name} />
        <FormField label={tCommon("email")} name="email" type="email" defaultValue={user.email ?? ""} error={errors.email} />
        <FormSelect
          label={t("role")}
          name="role"
          defaultValue={user.role}
          required
          options={[
            { value: "WORKER", label: t("worker") },
            { value: "ADMIN", label: t("admin") },
          ]}
          error={errors.role}
        />
        <FormSelect
          label={tCommon("language")}
          name="language"
          defaultValue={user.language}
          required
          options={[
            { value: "EN", label: "English" },
            { value: "SK", label: "Slovenčina" },
          ]}
          error={errors.language}
        />
        <FormField
          label={t("defaultPriceTie")}
          name="defaultPriceTie"
          type="number"
          step="0.01"
          defaultValue={user.defaultPriceTie}
          error={errors.defaultPriceTie}
        />
        <FormField
          label={t("defaultPriceConnect")}
          name="defaultPriceConnect"
          type="number"
          step="0.01"
          defaultValue={user.defaultPriceConnect}
          error={errors.defaultPriceConnect}
        />
        <label className="flex items-center gap-2 text-sm text-slate-ink">
          <input type="checkbox" name="active" defaultChecked={user.active} />
          {tCommon("active")}
        </label>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("save")}
        </Button>
      </form>

      <div className="mt-10 pt-6 border-t border-border-soft">
        <Button onClick={onResetPassword} variant="secondary" disabled={pending}>
          {t("resetPassword")}
        </Button>
        {tempPassword && (
          <p className="mt-3 text-sm text-navy">
            {t("tempPassword", { password: tempPassword })}
          </p>
        )}
      </div>
    </>
  );
}
