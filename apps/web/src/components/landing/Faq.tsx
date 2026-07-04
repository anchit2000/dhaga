import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/utils/constants/landing";
import { SectionHeading } from "./SectionHeading";

export function Faq() {
  return (
    <section className="border-t border-seam" id="faq">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <SectionHeading
          eyebrow="Questions"
          heading="Asked before you had to."
          headingClassName="max-w-none"
        />
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
