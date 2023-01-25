import {
  connectApi,
  getReferendumSubmittedMoment,
  getReferendumFinishedMoment,
} from "./packages/polkadot-api/mod.ts";
import {
  AccountVote,
  ApiPromise,
  ApiSchema,
  castPrimitive,
  Registration,
} from "./packages/polkadot-api/types.ts";

async function fetchBlockBatch(
  api: ApiPromise,
  start: number,
  step: number,
  current: number
) {
  const next = Math.min(current, start + step);

  const batchBlocks = await Promise.all(
    Array(next - start)
      .fill(null)
      .map(async (_, ix) => {
        const blockNumber = start + ix;

        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const { block } = await api.rpc.chain.getBlock(blockHash);

        return block;
      })
  );

  return batchBlocks;
}

async function listVoters(pollId: number, startingAt?: number) {
  const votersFilePath = `voters-${pollId}.csv`;

  const api = await connectApi(
    ApiSchema.WS,
    "wss://rpc.dotters.network/kusama"
  );

  const [since, current] = [
    startingAt ?? await getReferendumSubmittedMoment(api, pollId),
    await getReferendumFinishedMoment(api, pollId),
  ];

  console.log(`Fetching info from blocks ${since}...${current}`);

  if (!startingAt) {
    await Deno.writeTextFile(
      votersFilePath,
      "account,vote,balance,conviction,id:display,id:riot,id:twitter,id:email\n"
    );
  }
  const step = 120;
  for (let start = since; start < current; start += step) {
    console.time("fetchBlocks");
    console.log(`Fetching blocks ${start}...${start + step}`);

    const blocks = await fetchBlockBatch(api, start, step, current);
    const extrinsics = blocks
      .flatMap((block) =>
        block.extrinsics.map((extrinsic) => ({ block, extrinsic }))
      )
      .filter(({ extrinsic }) => {
        const { method: pallet, section: call } = api.registry.findMetaCall(
          extrinsic.method.callIndex
        );

        return pallet === "vote" && call === "convictionVoting";
      })
      .filter(
        ({ extrinsic }) =>
          castPrimitive<number>(extrinsic.method.args.at(0)!) === pollId
      );

    for (const { block, extrinsic: gExtrinsic } of extrinsics) {
      const extrinsic = gExtrinsic.unwrap();
      const accountVote = (<unknown>extrinsic.method.args.at(1)) as AccountVote;

      if (accountVote.isStandard) {
        const signer = extrinsic.signature.signer.value;
        const { balance, vote } = accountVote.asStandard;
        const { isAye, conviction } = vote;

        const identityCodec = await api.query.identity.identityOf(
          signer.toHex()
        );
        const identity = identityCodec.isEmpty
          ? undefined
          : (identityCodec.unwrap() as Registration);

        await Deno.writeTextFile(
          votersFilePath,
          [
            block.header.number,
            signer.toHuman(),
            isAye ? 1 : 0,
            balance.toBigInt(),
            conviction.toNumber(),
            ...(!identity?.isEmpty
              ? [
                  identity?.info.display?.asRaw?.toPrimitive() ?? "",
                  identity?.info.riot?.asRaw?.toPrimitive() ?? "",
                  identity?.info.twitter?.asRaw?.toPrimitive() ?? "",
                  identity?.info.email?.asRaw?.toPrimitive() ?? "",
                ]
              : []),
          ].join(",") + "\n",
          {
            append: true,
          }
        );
      }
    }

    console.timeEnd("fetchBlocks");
  }
}

const POLL_ID = 77;
await listVoters(POLL_ID);

Deno.exit();
