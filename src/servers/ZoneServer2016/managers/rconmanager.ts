// ======================================================================
//
//   GNU GENERAL PUBLIC LICENSE
//   Version 3, 29 June 2007
//   copyright (C) 2020 - 2021 Quentin Gruber
//   copyright (C) 2021 - 2023 H1emu community
//
//   https://github.com/QuentinGruber/h1z1-server
//   https://www.npmjs.com/package/h1z1-server
//
//   Based on https://github.com/psemu/soe-network
// ======================================================================

import * as http from "http";
import express from "express";
import bodyParser from "body-parser";
import { ZoneServer2016 } from "../zoneserver";
import { ZoneClient2016 } from "../classes/zoneclient";

function requireAuthorization(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const authorizationHeader = req.headers.authorization;
  const expectedKey = process.env.RCON_PASSWORD;

  if(!expectedKey) {
    res.status(401).json({ error: "Key not set" });
    return;
  }
  if (!authorizationHeader || authorizationHeader !== expectedKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Authorization succeeded, proceed to the next middleware or route handler
  next();
}

export class RConManager {
  private app: express.Express;
  private server: http.Server;
  private zoneServer: ZoneServer2016;

  constructor(zoneServer: ZoneServer2016) {
    this.zoneServer = zoneServer;
    this.app = express();
    this.server = http.createServer(this.app);

    // Configure body-parser middleware to parse JSON requests
    this.app.use(bodyParser.json());
    this.app.use(requireAuthorization);

    // Define routes
    this.app.get("/rcon/players", this.handleGetPlayers.bind(this));
    this.app.post("/rcon/alert", this.handleSendAlert.bind(this));
    this.app.post("/rcon/shutdown", this.handleShutdown.bind(this));
  }

  public startHttpServer(port: number): void {
    this.server.listen(port, () => {
      console.log(`HTTP server listening on port ${port}`);
    });
  }

  private handleGetPlayers(req: express.Request, res: express.Response): void {
    // Use the ZoneServer2016 instance to send the alert
    var players = this.zoneServer._clients;
    var playerList: {
      guid: string | undefined;
      character: { name: string  };
      isAdmin: boolean;
      isDebugMode: boolean;
      HWID: string;
      pvpStats: {
        shotsFired: number;
        shotsHit: number;
        head: number;
        spine: number;
        hands: number;
        legs: number;
      };
      clientLogs: {
        log: string;
        isSuspicious: boolean;
      }[];
      loginSessionId: string;
      sessionId: number;
      soeClientId: string;
      avgPing: number;
      permissionLevel: number;
    }[] = [];
    Object.values(this.zoneServer._clients).forEach(
      (client: ZoneClient2016) => {
        const { position, rotation } = client.character.state;
        // client,
        // `position: ${position[0].toFixed(2)},${position[1].toFixed(
        //   2
        // )},${position[2].toFixed(2)}`
        playerList.push({
          guid: client.guid,
          character: {
            name: client.character.name
            // positon: ,
            // rotation
          },
          isAdmin: client.isAdmin,
          isDebugMode: client.isDebugMode,
          HWID: client.HWID,
          pvpStats: client.pvpStats,
          clientLogs: client.clientLogs,
          loginSessionId: client.loginSessionId,
          sessionId: client.sessionId,
          soeClientId: client.soeClientId,
          avgPing: client.avgPing,
          permissionLevel: client.permissionLevel,
        });
      }
    );
    res.json({ success: true, players: playerList });
  }
  private handleSendAlert(req: express.Request, res: express.Response): void {
    if (!req.body.msg) res.json({ success: false, msg: "no message provided" });
    // Use the ZoneServer2016 instance to send the alert
    this.zoneServer.sendAlertToAll(`Broadcast from SYSTEM: ${req.body.msg}`);

    res.json({ success: true, msg: req.body.msg });
  }
  private async handleShutdown(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    // Use the ZoneServer2016 instance to send the alert
    this.zoneServer.sendAlertToAll(
      `Broadcast from SYSTEM: Server is shutting down NOW.`
    );
    this.zoneServer.sendDataToAll("WorldShutdownNotice", {
      timeLeft: 0,
      message: "Zone is shutting down.",
    });
    await this.zoneServer.saveWorld();
    setTimeout(() => {
      Object.values(this.zoneServer._clients).forEach(
        (client: ZoneClient2016) => {
          this.zoneServer.sendData(
            client as any,
            "CharacterSelectSessionResponse",
            {
              status: 1,
              sessionId: client.loginSessionId,
            }
          );
        }
      );
    }, 2000);
    setTimeout(() => {
      process.exit(0);
    }, 6000);
    res.json({ success: true, msg: "zone shut down" });
  }
}
