"use client";

export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  // register() pode resolver enquanto o worker ainda está instalando. O Push
  // Manager, especialmente em PWAs do iOS, exige um worker ativo para assinar.
  return navigator.serviceWorker.ready;
}
