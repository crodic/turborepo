"use client";

import React, { createContext, useContext, useMemo } from "react";
import { isWhiteLabelEnabled } from "./white-label.config";
import { WhiteLabelMetadata } from "./white-label-metadata";
import { WhiteLabelStyleInjector } from "./white-label-style-injector";
import { useActiveClientWhiteLabel } from "./white-label.service";
import type {
  ActiveClientWhiteLabel,
  WhiteLabelContextValue,
} from "./white-label.types";

const WhiteLabelContext = createContext<WhiteLabelContextValue>({
  whiteLabel: null,
  isEnabled: false,
  isLoading: false,
});

type WhiteLabelProviderProps = {
  children: React.ReactNode;
  initialData?: ActiveClientWhiteLabel | null;
};

export function WhiteLabelProvider({
  children,
  initialData,
}: WhiteLabelProviderProps) {
  if (!isWhiteLabelEnabled) {
    return <>{children}</>;
  }

  return (
    <ActiveWhiteLabelConsumer initialData={initialData}>
      {children}
    </ActiveWhiteLabelConsumer>
  );
}

function ActiveWhiteLabelConsumer({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: ActiveClientWhiteLabel | null;
}) {
  const { data: whiteLabel, isLoading } =
    useActiveClientWhiteLabel(initialData);

  const value = useMemo<WhiteLabelContextValue>(
    () => ({
      whiteLabel: whiteLabel ?? null,
      isEnabled: true,
      isLoading,
    }),
    [whiteLabel, isLoading]
  );

  return (
    <WhiteLabelContext.Provider value={value}>
      <WhiteLabelStyleInjector styles={whiteLabel?.styles} />
      <WhiteLabelMetadata whiteLabel={whiteLabel} />
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel(): WhiteLabelContextValue {
  return useContext(WhiteLabelContext);
}
