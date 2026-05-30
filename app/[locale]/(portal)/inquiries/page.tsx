import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { DataTable } from "@/components/portal/DataTable";

export default async function InquiriesListPage() {
  await requireAdmin();
  const t = await getTranslations("inquiries");
  const tCommon = await getTranslations("common");
  const tServices = await getTranslations("services");
  const rows = await prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">{t("list")}</h1>
      <DataTable
        headers={[tCommon("name"), tCommon("email"), t("service"), tCommon("status"), t("received"), tCommon("actions")]}
        rows={rows.map((r) => [
          r.name,
          r.email,
          r.serviceType === "other" ? "—" : tServices(`${r.serviceType}.name`),
          t(`status.${r.status}`),
          r.createdAt.toLocaleDateString(),
          <Link key={r.id} href={`/inquiries/${r.id}`} className="text-navy underline">
            {tCommon("edit")}
          </Link>,
        ])}
      />
    </div>
  );
}
