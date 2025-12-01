export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Zero Friction Budget</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Zero Friction Budget. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
