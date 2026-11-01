export interface QuarterReviewFacts {
  tacticIds: string[];
  wildcardChoiceId: string | null;
  hiredTalentId: string | null;
  bigBetId: string | null;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
}

export function quarterReviewFacts(input: {
  tacticIds: string[];
  wildcardChoiceId?: string | null;
  hiredTalentId?: string | null;
  bigBetId?: string | null;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
}): QuarterReviewFacts {
  return {
    tacticIds: [...input.tacticIds],
    wildcardChoiceId: input.wildcardChoiceId ?? null,
    hiredTalentId: input.hiredTalentId ?? null,
    bigBetId: input.bigBetId ?? null,
    revenue: input.revenue,
    profit: input.profit,
    marketShare: input.marketShare,
    customerSatisfaction: input.customerSatisfaction,
    brandAwareness: input.brandAwareness,
  };
}

export function reviewsDiffer(left: QuarterReviewFacts, right: QuarterReviewFacts): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}
