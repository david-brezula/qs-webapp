import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/portal/session";
import { EditWorkerForm } from "./EditWorkerForm";

export default async function EditWorkerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();
  // Clients are managed under /clients, not the worker editor.
  if (user.role === "CLIENT") notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-navy mb-2">{user.name}</h1>
      <p className="text-sm text-muted mb-1">
        <span className="font-mono">{user.username}</span>
        {user.email && <span className="ml-2">· {user.email}</span>}
      </p>
      {user.mustChangePassword && (
        <p className="text-xs text-accent font-semibold mb-6 mt-2">
          Must change password on next login
        </p>
      )}
      <EditWorkerForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          language: user.language,
          active: user.active,
          defaultPriceTie: Number(user.defaultPriceTie),
          defaultPriceConnect: Number(user.defaultPriceConnect),
        }}
      />
    </div>
  );
}
