import { z } from "zod";
import type {
  ComponentLayer,
  ComponentRegistry,
} from "@/components/ui/ui-builder/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flexbox } from "@/components/ui/ui-builder/components/flexbox";
import { Grid } from "@/components/ui/ui-builder/components/grid";
import { Icon } from "@/components/ui/ui-builder/components/icon";

const primitiveTypes = [
  "a",
  "button",
  "form",
  "input",
  "textarea",
  "select",
  "label",
  "img",
  "div",
  "iframe",
  "span",
  "h1",
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "section",
  "main",
  "article",
  "header",
  "footer",
] as const;

const primitiveComponentDefinitions = Object.fromEntries(
  primitiveTypes.map((type) => [type, { schema: z.any() }])
) as ComponentRegistry;

const complexComponentDefinitions = {
  Flexbox: {
    component: Flexbox,
    schema: z.any(),
    from: "@/components/ui/ui-builder/flexbox",
  },
  Grid: {
    component: Grid,
    schema: z.any(),
    from: "@/components/ui/ui-builder/grid",
  },
  Icon: {
    component: Icon,
    schema: z.any(),
    from: "@/components/ui/ui-builder/icon",
  },
  Button: {
    component: Button,
    schema: z.any(),
    from: "@/components/ui/button",
    defaultChildren: [
      {
        id: "button-text",
        type: "span",
        name: "span",
        props: {},
        children: "Button",
      } satisfies ComponentLayer,
    ],
  },
  Badge: { component: Badge, schema: z.any(), from: "@/components/ui/badge" },
  Accordion: {
    component: Accordion,
    schema: z.any(),
    from: "@/components/ui/accordion",
  },
  AccordionItem: {
    component: AccordionItem,
    schema: z.any(),
    from: "@/components/ui/accordion",
  },
  AccordionTrigger: {
    component: AccordionTrigger,
    schema: z.any(),
    from: "@/components/ui/accordion",
  },
  AccordionContent: {
    component: AccordionContent,
    schema: z.any(),
    from: "@/components/ui/accordion",
  },
  Card: { component: Card, schema: z.any(), from: "@/components/ui/card" },
  CardHeader: {
    component: CardHeader,
    schema: z.any(),
    from: "@/components/ui/card",
  },
  CardFooter: {
    component: CardFooter,
    schema: z.any(),
    from: "@/components/ui/card",
  },
  CardTitle: {
    component: CardTitle,
    schema: z.any(),
    from: "@/components/ui/card",
  },
  CardDescription: {
    component: CardDescription,
    schema: z.any(),
    from: "@/components/ui/card",
  },
  CardContent: {
    component: CardContent,
    schema: z.any(),
    from: "@/components/ui/card",
  },
} satisfies ComponentRegistry;

export const pageBuilderComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
};
