"use client";

// "Which plan should we build for you?" (BodyPathwayViewController)

import React from "react";
import { PATHWAY_SCREEN } from "./appCopy";
import { Body, Button, Footer, Header, OptionCard, Screen, Subtitle, Title } from "./atelier";

export default function PathwayScreen({ pathway, onSelect, onNext, onBack }) {
  return (
    <Screen>
      <Header onBack={onBack} railStep={1} railFraction={pathway ? 0.5 : 0.14} />
      <Body>
        <div className="funnel-rise pt-4" style={{ animationDelay: "60ms" }}>
          <Title>{PATHWAY_SCREEN.title}</Title>
          <Subtitle className="mt-2">{PATHWAY_SCREEN.subtitle}</Subtitle>
        </div>
        <div className="mt-6 space-y-3 pb-4">
          {PATHWAY_SCREEN.options.map((option, i) => (
            <div key={option.id} className="funnel-rise" style={{ animationDelay: `${140 + i * 70}ms` }}>
              <OptionCard
                id={option.id}
                symbol={option.symbol}
                title={option.title}
                detail={option.detail}
                selected={pathway === option.id}
                onClick={() => onSelect(option.id)}
              />
            </div>
          ))}
        </div>
      </Body>
      <Footer>
        <Button onClick={onNext} disabled={!pathway} id="onboarding.pathway.continue">
          {PATHWAY_SCREEN.cta}
        </Button>
      </Footer>
    </Screen>
  );
}
