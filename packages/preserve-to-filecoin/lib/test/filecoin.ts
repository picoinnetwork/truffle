const IpfsHttpClient: any = require("ipfs-http-client");

import * as Preserve from "@truffle/preserve";
import { preserveToIpfs } from "../../../preserve-to-ipfs";
import {
  preserveToFilecoin,
  createLotusClient,
  LotusClient,
  getDealState
} from "../filecoin";

import { fetch } from "../../test/fetch";

interface Test {
  name: string;
  target: Preserve.Target;
}

const tests: Test[] = [
  // Not supported yet!
  // {
  //   name: "single-source",
  //   target: {
  //     source: "a"
  //   }
  // },
  {
    name: "two-sources",
    target: {
      source: {
        entries: [
          {
            path: "a",
            source: "a"
          },
          {
            path: "b",
            source: "b"
          }
        ]
      }
    }
  },
  {
    name: "wrapper-directory",
    target: {
      source: {
        entries: [
          {
            path: "directory",
            source: {
              entries: [
                {
                  path: "a",
                  source: "a"
                },
                {
                  path: "b",
                  source: "b"
                }
              ]
            }
          }
        ]
      }
    }
  },
  {
    // foo/
    //  a/
    //   1
    //   2
    //  b/
    //   3
    //   4
    // bar/
    //  5
    name: "nested-directories",
    target: {
      source: {
        entries: [
          {
            path: "a",
            source: {
              entries: [
                {
                  path: "a",
                  source: "a/a"
                },
                {
                  path: "b",
                  source: "a/b"
                }
              ]
            }
          },
          {
            path: "b",
            source: "b"
          }
        ]
      }
    }
  }
];

describe("preserveToFilecoin", () => {
  let IPFSConfig: {
    host: string;
    port: string;
    protocol: string;
    apiPath: string;
  };
  let address: string;

  beforeAll(async () => {
    // Configured for Textile's powergate devnet
    // https://docs.textile.io/powergate/devnet/
    IPFSConfig = {
      host: "localhost",
      port: "5001",
      protocol: "http",
      apiPath: "/api/v0"
    };
    address = "ws://localhost:7777/0/node/rpc/v0";
  });

  afterAll(async () => {});

  for (const { name, target } of tests) {
    // separate describe block for each test case
    describe(`test: ${name}`, () => {
      let ipfs: any; // client
      let client: LotusClient;

      beforeAll(async () => {
        ipfs = IpfsHttpClient(IPFSConfig);
        client = createLotusClient({ wsUrl: address });
      });

      it("stores to Filecoin correctly", async () => {
        jest.setTimeout(200000);

        const { cid } = await preserveToIpfs({
          target,
          ipfs: {
            address:
              IPFSConfig.protocol +
              "://" +
              IPFSConfig.host +
              ":" +
              IPFSConfig.port +
              IPFSConfig.apiPath
          }
        });

        const proposalResult = await preserveToFilecoin({
          target: target,
          filecoin: {
            address: address
          },
          getIPFSCidForTarget: async target => {
            return cid;
          }
        });

        const state = await getDealState(proposalResult["/"], client);

        expect(state).toEqual("Active");
      });
    });
  }
});
