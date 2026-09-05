import { z } from "zod";

export const eventTypes = ["reuniao", "follow_up", "prazo", "tarefa"] as const;
export const reminderValues = [0, 5, 15, 30, 60, 1440] as const;

const optionalUuid = z.string().uuid().nullish();
const reminder = z
  .number()
  .int()
  .nullable()
  .refine(
    (value) => value === null || reminderValues.includes(value as never),
    "Lembrete inválido.",
  );

export const eventInputSchema = z
  .object({
    titulo: z.string().trim().min(1).max(200),
    descricao: z.string().trim().max(5000).optional().default(""),
    tipo: z.enum(eventTypes),
    dia_inteiro: z.boolean(),
    inicio: z.string().datetime({ offset: true }),
    fim: z.string().datetime({ offset: true }),
    lead_id: optionalUuid,
    cliente_id: optionalUuid,
    lembrete_minutos_antes: reminder.optional().default(null),
    participantes_user_ids: z.array(z.string().uuid()).min(1),
    recorrencia: z
      .object({
        tipo: z.enum(["unico", "diaria", "semanal", "mensal"]),
        ate: z.string().date(),
      })
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.lead_id && value.cliente_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escolha apenas lead ou cliente.",
        path: ["lead_id"],
      });
    }
    if (!value.dia_inteiro && Date.parse(value.fim) < Date.parse(value.inicio)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O fim deve ser igual ou posterior ao início.",
        path: ["fim"],
      });
    }
    if (value.recorrencia && value.recorrencia.tipo !== "unico") {
      const until = Date.parse(`${value.recorrencia.ate}T00:00:00.000Z`);
      if (until <= Date.parse(value.inicio)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A data final da recorrência deve ser posterior ao início.",
          path: ["recorrencia", "ate"],
        });
      }
    }
  });

export const eventPatchSchema = z
  .object({
    titulo: z.string().trim().min(1).max(200).optional(),
    descricao: z.string().trim().max(5000).nullable().optional(),
    tipo: z.enum(eventTypes).optional(),
    dia_inteiro: z.boolean().optional(),
    inicio: z.string().datetime({ offset: true }).optional(),
    fim: z.string().datetime({ offset: true }).optional(),
    lead_id: optionalUuid,
    cliente_id: optionalUuid,
    lembrete_minutos_antes: reminder.optional(),
    participantes_user_ids: z.array(z.string().uuid()).min(1).optional(),
    apply_to_series: z.boolean().optional().default(false),
  })
  .refine((value) => !(value.lead_id && value.cliente_id), {
    message: "Escolha apenas lead ou cliente.",
  });
