"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateOrgAction, type FormState } from "../actions";

export function OrgForm({ orgSlug, name }: { orgSlug: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateOrgAction.bind(null, orgSlug), {});
  return (
    <form action={action} className="mt-8 flex max-w-120 flex-col gap-4">
      <label className="field">
        <span className="label">Nama organisasi</span>
        <input
          name="name"
          required
          defaultValue={state.values?.name ?? name}
          className="input"
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name ? <span className="field-error">{state.fieldErrors.name}</span> : null}
      </label>
      <SubmitButton className="self-start" pendingLabel="Menyimpan…">
        Simpan nama
      </SubmitButton>
      {state.error && !state.fieldErrors ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
