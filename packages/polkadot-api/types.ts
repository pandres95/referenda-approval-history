import type { Codec } from "https://deno.land/x/polkadot@0.2.21/types/types/codec.ts";

export type {
  AccountVote,
  Block,
  ReferendumInfo,
  Registration,
} from "https://deno.land/x/polkadot@0.2.21/types/interfaces/types.ts";

export enum ApiSchema {
  WS,
  HTTP,
}

export type Deposit = {
  who: string;
  amount: number;
};

export interface ReferendumStatus {
  track: number;
  origin: { origins: string };
  proposal: Record<string, unknown>;
  enactment: {
    after: number;
  };
  submitted: number;
  submission_deposit: Deposit;
  deciding: {
    since: number;
    confirming: boolean | null;
  };
  tally: {
    ayes: number;
    nays: number;
    support: number;
  };
  inQueue: boolean;
  alarm: [number, number[]];
}

export type NotOngoing = [number, Deposit, Deposit];

export type { ApiPromise } from "https://deno.land/x/polkadot@0.2.21/api/mod.ts";

export function castPrimitive<T>(codec: Codec) {
  return <T>(codec.toPrimitive() as unknown);
}
