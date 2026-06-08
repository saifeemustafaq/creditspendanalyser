"use client";

import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 pb-safe pt-safe">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <CardTitle>You&apos;re offline</CardTitle>
          <CardDescription>
            Credit Spend Analyser needs an internet connection to load your spending data. Check
            your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          If you open the app from your home screen, you&apos;ll be signed in automatically once
          you&apos;re back online.
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" render={<Link href="/login" />}>
            Go to sign in
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
