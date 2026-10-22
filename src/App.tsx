// Temporary foundation screen (Phase 1). The real experience is designed in Phase 2 with Mohamed's approval.
export default function App(): React.JSX.Element {
  const logo = `${import.meta.env.BASE_URL}icon-512.png`
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <section className="text-center max-w-md">
        <img src={logo} alt="Instructor Motion" className="w-24 h-24 mx-auto mb-6" />
        <h1 className="text-2xl font-bold">Instructor Motion Training</h1>
        <p className="mt-3 opacity-80">الأساس الجديد للمنصة جاهز — جاري البناء</p>
        <p className="mt-1 text-sm opacity-60 font-[family-name:var(--font-latin)]">Foundation ready — 2.0 in progress</p>
        <p className="mt-8 text-xs opacity-50">Instructor: Mohamed Ayad</p>
      </section>
    </main>
  )
}
