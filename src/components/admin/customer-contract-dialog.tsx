"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createCustomerContract } from "@/app/admin/contratos/actions";
import { ContractForm } from "@/components/admin/contract-form";

export function CustomerContractDialog({
  customer,
}: {
  customer: { id: string; nome: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white"
      >
        <Plus className="size-4" />
        Novo contrato
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Novo contrato</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cliente: {customer.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-full border p-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <ContractForm
              action={createCustomerContract.bind(null, customer.id)}
              clients={[customer]}
              values={{ cliente_id: customer.id }}
            />
          </div>
        </div>
      )}
    </>
  );
}
