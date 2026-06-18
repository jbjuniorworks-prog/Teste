import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Left: navy brand hero (hidden on small screens) */}
      <section className="mav-hero relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="mav-grid pointer-events-none absolute inset-0 opacity-70" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />

        <p className="relative font-heading text-xl font-semibold tracking-tight text-white">
          MAV <span className="font-light text-white/80">Systems</span>
        </p>

        <div className="relative max-w-lg">
          <h1 className="!text-white text-4xl font-semibold leading-[1.15] xl:text-5xl">
            Transformando a gestão pública
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            com inovação, sustentabilidade e transparência.
          </p>
          <div className="mt-8 h-1 w-24 rounded-full bg-gradient-to-r from-primary to-emerald-300" />
        </div>

        <p className="relative text-sm text-white/50">
          © {new Date().getFullYear()} MAV Systems
        </p>
      </section>

      {/* Right: login form */}
      <section className="flex items-center justify-center bg-background p-6 sm:p-12">
        <LoginForm />
      </section>
    </div>
  );
}
