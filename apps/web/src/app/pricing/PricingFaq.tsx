import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PRICING_FAQ_ITEMS } from "@/utils/constants/landing";
import type { ReactElement } from "react";

// Same accordion treatment as the landing FAQ, over the pricing-specific
// subset. Kept in sync with the FAQPage JSON-LD by sharing one constant.
export function PricingFaq(): ReactElement {
  return (
    <section className="border-t border-seam" id="pricing-faq">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Pricing questions
        </h2>
        <Accordion multiple={false} className="mt-10">
          {PRICING_FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="min-h-11 text-left text-base text-paper hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-fog">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
