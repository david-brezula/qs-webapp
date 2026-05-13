export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-navy block mb-2">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={Boolean(error)}
        className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm text-slate-ink focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
      />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
