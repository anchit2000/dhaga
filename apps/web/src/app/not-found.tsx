import type { ReactElement } from "react";
import type { Metadata } from "next";

import { NotFoundContent } from "@/components/app/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found — Dhaga",
};

export default function NotFound(): ReactElement {
  return (
    <main className="flex flex-1 px-4 sm:px-8">
      <NotFoundContent />
    </main>
  );
}
