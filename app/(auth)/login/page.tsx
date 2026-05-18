import { AuthForm } from "../AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <AuthForm mode="login" />
    </div>
  );
}
