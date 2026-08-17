import { UserLoginForm } from "@/components/auth/user-login-form";

export function LoginPage() {
  return (
    <section className="min-h-screen bg-obsidian-950 px-5 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-md">
        <UserLoginForm />
      </div>
    </section>
  );
}