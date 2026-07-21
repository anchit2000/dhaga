import defaultMdxComponents from "fumadocs-ui/mdx";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

// Reusable component set every `/docs` page can use without importing:
// Fumadocs' primitives (already brand-themed via the `--color-fd-*` mapping in
// globals.css) plus the default element overrides. Page routes call this to
// build the component map passed to compiled MDX.
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Tab,
    Tabs,
    ...components,
  };
}
