"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginErrorPanel, type LoginDiagnosticPayload } from "@/components/login-error-panel";
import { LoginPwaInstallHint } from "@/components/login-pwa-install-hint";
import {
  parseAuthErrorResponse,
  reportClientLoginFailure,
} from "@/components/login-response-parser";
import { LOGIN_RESPONSE_PREVIEW_CHARS } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<LoginDiagnosticPayload | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setDiagnostic(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const responseText = await res.text();
      let parsed: ReturnType<typeof parseAuthErrorResponse>;
      try {
        parsed = parseAuthErrorResponse(JSON.parse(responseText));
      } catch (err) {
        console.error("LoginForm: auth response JSON parse failed:", err);
        parsed = null;
      }

      if (!parsed) {
        const preview = responseText.slice(0, LOGIN_RESPONSE_PREVIEW_CHARS);
        const payload = await reportClientLoginFailure({
          attemptedUsername: username,
          stage: "client_parse_error",
          message: res.ok
            ? "Login failed: server returned an invalid response."
            : `Login failed (${res.status}): server returned non-JSON.`,
          detail: preview || "Empty response body",
          httpStatus: res.status,
        });
        setDiagnostic({ ...payload, responseBodyPreview: preview });
        toast.error(payload.error);
        return;
      }

      if (!res.ok) {
        const isGatewayError = res.status === 502 || res.status === 503 || res.status === 504;
        if (isGatewayError && !parsed.detail) {
          const preview = responseText.slice(0, LOGIN_RESPONSE_PREVIEW_CHARS);
          const payload = await reportClientLoginFailure({
            attemptedUsername: username,
            stage: "client_parse_error",
            message: `Netlify function failed (${res.status})`,
            detail: [
              "The /api/auth serverless function crashed or timed out before returning JSON.",
              "Common causes:",
              "- MONGODB_URI missing or wrong in Netlify environment variables",
              "- MongoDB Atlas Network Access blocking Netlify (add 0.0.0.0/0)",
              "- AUTH_SECRET missing in Netlify environment variables",
              "- MongoDB driver bundling issue (redeploy after latest netlify.toml fix)",
              `Open ${window.location.origin}/api/auth/health to test env + MongoDB connectivity.`,
              `Response preview: ${preview || "(empty)"}`,
            ].join("\n"),
            httpStatus: res.status,
          });
          setDiagnostic({ ...payload, responseBodyPreview: preview });
          toast.error(payload.error);
          return;
        }

        setDiagnostic({
          error: parsed.error ?? "Login failed",
          code: parsed.code,
          logId: parsed.logId ?? null,
          detail: parsed.detail,
          httpStatus: res.status,
        });
        toast.error(parsed.error ?? "Login failed");
        return;
      }

      toast.success(`Welcome, ${parsed.username}`);
      const next = params.get("from") ?? "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      const payload = await reportClientLoginFailure({
        attemptedUsername: username,
        stage: "client_network_error",
        message,
        detail: err instanceof Error ? err.stack : undefined,
      });
      setDiagnostic(payload);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {diagnostic && <LoginErrorPanel payload={diagnostic} />}
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4 pt-safe pb-safe">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Credit Spend Analyser</CardTitle>
          <CardDescription>Sign in to view your spending insights.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <LoginForm />
          </Suspense>
          <LoginPwaInstallHint />
        </CardContent>
      </Card>
    </div>
  );
}
