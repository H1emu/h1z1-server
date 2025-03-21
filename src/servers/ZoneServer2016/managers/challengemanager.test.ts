// ======================================================================
//
//   GNU GENERAL PUBLIC LICENSE
//   Version 3, 29 June 2007
//   copyright (C) 2020 - 2021 Quentin Gruber
//   copyright (C) 2021 - 2025 H1emu community
//
//   https://github.com/QuentinGruber/h1z1-server
//   https://www.npmjs.com/package/h1z1-server
//
//   Based on https://github.com/psemu/soe-network
// ======================================================================
import test, { after } from "node:test";
import { ZoneServer2016 } from "../zoneserver";

process.env.FORCE_DISABLE_WS = "true";
const isMongoTests = process.env.MONGO_TESTS === "true";
test("Challenge-Mongo", { timeout: 10000, skip: !isMongoTests }, async (t) => {
  t.todo();
  return;
  const zone = new ZoneServer2016(
    0,
    Buffer.from("fake"),
    "mongodb://localhost:27017"
  );
  await zone.start();
});

after(() => {
  setImmediate(() => {
    process.exit(0);
  });
});
