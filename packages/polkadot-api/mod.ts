import {
  ApiPromise,
  HttpProvider,
  WsProvider,
} from "https://deno.land/x/polkadot@0.2.21/api/mod.ts";
import {
  ApiSchema,
  ReferendumInfo,
  ReferendumStatus,
  castPrimitive,
} from "./types.ts";

import type { ApiDecoration } from "https://deno.land/x/polkadot@0.2.21/api/types/index.ts";
import type { ProviderInterface } from "https://deno.land/x/polkadot@0.2.21/rpc-provider/types.ts";

const TIMEOUT_IN_MS = 200_000;

export function connectApi(schema: ApiSchema, url: string) {
  let provider: ProviderInterface;
  switch (schema) {
    case ApiSchema.WS:
      provider = new WsProvider(url, undefined, undefined, TIMEOUT_IN_MS);
      break;
    case ApiSchema.HTTP:
      provider = new HttpProvider(url);
      break;
  }

  return ApiPromise.create({ provider });
}

export async function getReferendumInfo(
  api: ApiPromise | ApiDecoration<"promise">,
  pollId: number
) {
  return (
    await api.query.referenda.referendumInfoFor(pollId)
  ).unwrap() as ReferendumInfo;
}

export async function getReferendumSubmittedMoment(
  api: ApiPromise,
  pollId: number
) {
  const referendumInfo = await getReferendumInfo(api, pollId);
  let ongoingReferendum: ReferendumStatus;

  // Referendum has been submitted
  if (referendumInfo.isOngoing) {
    ongoingReferendum = castPrimitive(referendumInfo.asOngoing);
  } else {
    const finalized = referendumInfo.asFinished.end;
    const blockHash = await api.rpc.chain.getBlockHash(finalized);

    const apiAtClosingBlock = await api.at(blockHash);
    const referendumInfoAtClosingBlock = await getReferendumInfo(
      apiAtClosingBlock,
      pollId
    );

    ongoingReferendum = castPrimitive(
      referendumInfoAtClosingBlock.asOngoing
    ) as ReferendumStatus;
  }

  return ongoingReferendum.submitted;
}

export async function getReferendumFinishedMoment(
  api: ApiPromise,
  pollId: number
) {
  const referendumInfo = await getReferendumInfo(api, pollId);

  if (referendumInfo.isFinished) {
    return referendumInfo.asFinished.end.toNumber();
  }

  const currentCodec = await api.query.system.number();
  return currentCodec.toPrimitive() as number;
}
