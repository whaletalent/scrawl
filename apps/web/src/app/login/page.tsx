"use client";
import { AccountPage } from "@/components/account/account-page";
import { AuthForm } from "@/components/account/auth-form";

export default function LoginPage() {
  return (
    <AccountPage for="signed-out" title="Entrar no Scrawl" bare>
      {() => <AuthForm />}
    </AccountPage>
  );
}
