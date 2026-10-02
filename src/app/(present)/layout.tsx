export default function WorkshopPresentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-theme-page">
      <a href="#presenter-content" className="skip-to-content">
        Skip to content
      </a>
      {children}
    </div>
  );
}
