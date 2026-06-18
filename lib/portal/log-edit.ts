/**
 * Decides whether an ActivityLog entry may be edited or removed.
 *
 * Rules (decision: "until section is invoiced"):
 * - Admins always may (absolute power).
 * - A worker may correct their OWN entry until they have invoiced that section
 *   (a SectionInvoice row exists for the entry's section + the worker). After
 *   invoicing, the entry locks; un-invoicing the section reopens it.
 * - A worker may never touch another worker's entry.
 */
export function canEditLog(input: {
  isAdmin: boolean;
  isOwn: boolean;
  sectionInvoiced: boolean;
}): boolean {
  if (input.isAdmin) return true;
  if (!input.isOwn) return false;
  return !input.sectionInvoiced;
}
