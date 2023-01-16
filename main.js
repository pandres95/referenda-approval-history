import {
  ApiPromise,
  WsProvider,
} from "https://deno.land/x/polkadot@0.2.21/api/mod.ts";

type ReferendumInfo = {
  ongoing: {
    submitted: number;
    tally: { ayes: number; nays: number; support: number };
  };
};

function formatAmount(n: number | string) {
  if (typeof n === "string" && n.startsWith("0x")) {
    return parseInt(n.substring(2), 16);
  }

  return n;
}

async function printBlockInfo(api: ApiPromise, refId: number, block: number) {
  const hash = (await api.rpc.chain.getBlockHash(block)).toHex();

  const apiAt = await api.at(hash);
  const referendumInfoCodec = await apiAt.query.referenda.referendumInfoFor(
    refId
  );
  const { ongoing } = referendumInfoCodec.toJSON() as ReferendumInfo;

  const [ayes, nays, support] = [
    formatAmount(ongoing.tally.ayes),
    formatAmount(ongoing.tally.nays),
    formatAmount(ongoing.tally.support),
  ];

  console.log(`${block},${ayes},${nays},${support}`);
}

async function getTally(refId: number, step = 600) {
  const api = await ApiPromise.create({
    provider: new WsProvider("wss://rpc.dotters.network/kusama"),
  });

  const initialRefInfoCodec = await api.query.referenda.referendumInfoFor(
    refId
  );

  const initialRefInfo = initialRefInfoCodec.toJSON() as ReferendumInfo;
  const since = initialRefInfo.ongoing.submitted;

  const currentCodec = await api.query.system.number();
  const current = currentCodec.toJSON() as number;

  let block = since;

  console.log("block,ayes,nays,support");
  while (block < current) {
    await printBlockInfo(api, refId, block);
    block += step;
  }
  await printBlockInfo(api, refId, current);
}

const REF_ID = 47;
await getTally(REF_ID);

Deno.exit();
