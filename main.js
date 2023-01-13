import { ApiPromise, WsProvider } from 'https://deno.land/x/polkadot@0.2.21/api/mod.ts';

const api = await ApiPromise.create({ provider: new WsProvider("wss://rpc.dotters.network/kusama") });
const REF_ID = 47;
const STEP = 3000;

let ref = await api.query.referenda.referendumInfoFor(REF_ID);
ref = ref.unwrap().asOngoing;
const since = ref.submitted.toNumber();

let block = since;
const current = (await api.query.system.number()).toNumber();
console.log('block,ayes,nays,support')
while (block < current) {
  const hash = (await api.rpc.chain.getBlockHash(block)).toHex();
  let ref = await api.query.referenda.referendumInfoFor.at(hash, REF_ID);
  ref = ref.unwrap().asOngoing;
  const [ ayes, nays, support ] = [ ref.tally.ayes.toBigInt(), ref.tally.nays.toBigInt(), ref.tally.support.toBigInt() ];
  console.log(`${block},${ayes},${nays},${support}`);
  block += STEP;
}

Deno.exit();