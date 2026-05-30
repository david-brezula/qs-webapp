import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { InquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { Button } from "@/components/ui/Button";

const STATUSES: InquiryStatus[] = ["NEW", "IN_PROGRESS", "CLOSED"];

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("inquiries");
  const tServices = await getTranslations("services");
  const row = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!row) notFound();

  async function updateStatus(formData: FormData) {
    "use server";
    await requireAdmin();
    const status = String(formData.get("status")) as InquiryStatus;
    if (!STATUSES.includes(status)) return;
    await prisma.contactSubmission.update({ where: { id }, data: { status } });
    revalidatePath(`/inquiries/${id}`);
  }

  const fields: [string, string][] = [
    ["Name", row.name],
    ["Email", row.email],
    ["Phone", row.phone ?? "—"],
    ["Company", row.company ?? "—"],
    ["Service", row.serviceType === "other" ? "—" : tServices(`${row.serviceType}.name`)],
    ["Message", row.message || "—"],
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("detail")}</h1>
      <dl className="divide-y divide-border-soft border-y border-border-soft">
        {fields.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-4 py-3 text-sm">
            <dt className="text-slate-ink">{label}</dt>
            <dd className="text-navy break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <form action={updateStatus} className="mt-8 flex items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm text-slate-ink mb-2">{t("updateStatus")}</label>
          <select id="status" name="status" defaultValue={row.status}
            className="rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-navy">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary">{t("save")}</Button>
      </form>
    </div>
  );
}
