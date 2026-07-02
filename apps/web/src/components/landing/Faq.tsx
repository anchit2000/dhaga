import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/utils/constants/landing";

export function Faq() {
  return (
    <section className="border-t border-seam" id="faq">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber">
          Questions
        </p>
        <h2 className="mt-4 text-balance font-display text-4xl font-medium sm:text-5xl">
          Asked before you had to.
        </h2>
        <Accordion multiple={false} className="mt-10">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="text-left text-base text-paper hover:no-underline">
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
