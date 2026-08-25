"use client";

import { BellRing, CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { registrarServiceWorker } from "@/lib/push/registrar-service-worker";

type PushState =
  | "verificando"
  | "nao_suportado"
  | "negado"
  | "nao_ativado"
  | "ativando"
  | "ativo"
  | "erro";

export function AtivarPush({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [state, setState] = useState<PushState>("verificando");
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void detectCurrentState();

    async function detectCurrentState() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("nao_suportado");
        return;
      }
      const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setIosNeedsInstall(isIos && !standalone);
      if (Notification.permission === "denied") {
        setState("negado");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "ativo" : "nao_ativado");
    }
  }, []);

  async function activate() {
    if (iosNeedsInstall) return;
    setErrorMessage(null);
    setState("ativando");
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("Chave VAPID pública ausente.");
      const registration = await registrarServiceWorker();
      if (!registration) throw new Error("Service Worker indisponível.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "negado" : "nao_ativado");
        return;
      }
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToArrayBuffer(vapidPublicKey),
        }));
      const serialized = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: serialized.keys,
          device_label: deviceLabel(navigator.userAgent),
          user_agent: navigator.userAgent,
        }),
      });
      if (!response.ok) {
        await subscription.unsubscribe();
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          result?.error ?? `Falha ao salvar assinatura (${response.status}).`,
        );
      }
      setState("ativo");
    } catch (error) {
      console.error("Falha ao ativar Web Push", error);
      setErrorMessage(pushErrorMessage(error));
      setState("erro");
    }
  }

  if (state === "verificando" || state === "ativo") return null;

  const feedback =
    state === "negado"
      ? "As notificações estão bloqueadas neste navegador. Libere a permissão nas configurações do site e tente novamente."
      : state === "nao_suportado"
        ? "Este navegador não oferece suporte a Web Push."
        : state === "erro"
          ? (errorMessage ??
            "Não foi possível ativar agora. Confira a conexão e tente novamente.")
          : null;

  return (
    <section className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="flex gap-4">
        <span className="h-fit rounded-xl bg-primary p-2.5 text-white">
          <BellRing className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-bold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
          {iosNeedsInstall && (
            <p className="mt-3 text-sm font-medium text-amber-900">
              No iPhone/iPad, para receber notificações você precisa primeiro
              instalar o app: toque em Compartilhar → Adicionar à Tela de
              Início. Depois abra pela tela de início e ative aqui.
            </p>
          )}
          {feedback && (
            <p className="mt-3 flex items-start gap-2 text-sm font-medium text-amber-900">
              <CircleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {feedback}
            </p>
          )}
          <Link
            href="/admin/configuracoes/dispositivos"
            className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
          >
            Gerenciar dispositivos
          </Link>
        </div>
      </div>
      {!iosNeedsInstall && state !== "nao_suportado" && state !== "negado" && (
        <button
          type="button"
          onClick={activate}
          disabled={state === "ativando"}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto sm:shrink-0"
        >
          {state === "ativando" && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {state === "ativando" ? "Ativando…" : "Ativar notificações"}
        </button>
      )}
    </section>
  );
}

function pushErrorMessage(error: unknown) {
  if (!(error instanceof Error))
    return "Não foi possível ativar agora. Confira a conexão e tente novamente.";
  if (error.name === "InvalidAccessError" || error.name === "DataError")
    return "A chave de notificações deste ambiente é inválida. Contate o administrador.";
  if (error.name === "AbortError")
    return "O navegador não conseguiu concluir a assinatura. Feche e abra o app e tente novamente.";
  if (error.message === "Chave VAPID pública ausente.")
    return "As notificações ainda não foram configuradas neste ambiente.";
  return error.message;
}

function vapidKeyToArrayBuffer(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1)
    bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

function deviceLabel(userAgent: string) {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /CriOS\//.test(userAgent)
      ? "Chrome"
      : /FxiOS\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Firefox\//.test(userAgent)
            ? "Firefox"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : "Navegador";
  const device = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Macintosh/.test(userAgent)
            ? "Mac"
            : /Linux/.test(userAgent)
              ? "Linux"
              : "dispositivo";
  return `${browser} no ${device}`;
}
