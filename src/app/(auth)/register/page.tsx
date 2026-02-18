import { RegisterForm } from "@/components/auth/register-form";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold">
        <TrendingUp className="h-7 w-7 text-primary" />
        WealthPilot
      </Link>
      <RegisterForm />
    </div>
  );
}
