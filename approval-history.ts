import {
  connectApi,
  getReferendumFinishedMoment,
  getReferendumInfo,
  getReferendumSubmittedMoment,
} from "./packages/polkadot-api/mod.ts";
import {
  ApiSchema,
  ApiPromise,
  ReferendumInfo,
  ReferendumStatus,
  castPrimitive,
} from "./packages/polkadot-api/types.ts";

async function printBlockInfo(
  api: ApiPromise,
  pollId: number,
  blockNumber: number
) {
  const hash = (await api.rpc.chain.getBlockHash(blockNumber)).toHex();
  const block = await api.rpc.chain.getBlock(hash);

  const {
    args: { now },
  } = block.block.extrinsics.at(0)?.method?.toPrimitive() as {
    args: { now: number };
  };
  const blockTime = new Date(now);
  const blockDateString = `${blockTime
    .getUTCDate()
    .toString()
    .padStart(2, "0")}/${(blockTime.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}/${blockTime.getUTCFullYear()}`;
  const blockTimeString = `${blockTime
    .getUTCHours()
    .toString()
    .padStart(2, "0")}:${blockTime
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}:${blockTime
    .getUTCSeconds()
    .toString()
    .padStart(2, "0")}`;

  // Get referendun info
  const apiAt = await api.at(hash);
  const referendumInfoCodec = await getReferendumInfo(apiAt, pollId);

  const ongoing = castPrimitive(
    referendumInfoCodec.asOngoing
  ) as ReferendumStatus;

  const { ayes, nays, support } = ongoing.tally;
  const [alarm] = ongoing.alarm;

  console.log(
    `${blockNumber},${blockDateString} ${blockTimeString},${ayes},${nays},${support},${alarm}`
  );
}

async function getOngoingHistory(pollId: number, step = 600) {
  const api = await connectApi(
    ApiSchema.WS,
    "wss://rpc.dotters.network/kusama"
  );

  const since = await getReferendumSubmittedMoment(api, pollId);
  const current = await getReferendumFinishedMoment(api, pollId);
  let block = since + step;

  console.log("block,date,ayes,nays,support,alarm");
  while (block < current) {
    await printBlockInfo(api, pollId, block);
    block += step;
  }
}

const POLL_ID = 77;
await getOngoingHistory(POLL_ID);

Deno.exit();
