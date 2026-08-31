import React from "react";
import { isWhiteLabelEnabled } from "./white-label.config";
import type { WhiteLabelStyles } from "./white-label.types";
import {
  generateWhiteLabelCss,
  getGoogleFontHrefs,
  WHITE_LABEL_STYLE_TAG_ID,
} from "./white-label-utils";

export function WhiteLabelServerStyle({
  styles,
}: {
  styles?: WhiteLabelStyles;
}) {
  if (!isWhiteLabelEnabled || !styles) {
    return null;
  }

  const fontHrefs = getGoogleFontHrefs(styles);
  const css = generateWhiteLabelCss(styles);

  if (!css && fontHrefs.length === 0) {
    return null;
  }

  return (
    <>
      {fontHrefs.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {css ? (
        <style
          id={WHITE_LABEL_STYLE_TAG_ID}
          dangerouslySetInnerHTML={{ __html: css }}
        />
      ) : null}
    </>
  );
}
