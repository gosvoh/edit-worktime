"use client";

import { useFormState, useFormStatus } from "react-dom";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} aria-disabled={pending}>
      Submit
    </button>
  );
}

export function Form({
  children,
  action,
}: React.PropsWithChildren<{
  action: (
    prevState: any,
    formData: FormData
  ) => Promise<{ error: string | null }>;
}>) {
  const [state, formAction] = useFormState(action, { error: null });

  return (
    <form action={formAction}>
      {children}
      <Submit />
      <p className="error">{state.error}</p>
    </form>
  );
}
