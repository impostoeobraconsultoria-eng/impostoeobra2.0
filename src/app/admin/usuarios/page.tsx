export default function UsuariosPage() {
  return <ProtectedPlaceholder title="Usuários" />;
}

function ProtectedPlaceholder({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-4 text-muted-foreground">Área exclusiva para admin.</p>
    </main>
  );
}
