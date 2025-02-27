// ======================================================================
//
//   GNU GENERAL PUBLIC LICENSE
//   Version 3, 29 June 2007
//   copyright (C) 2020 - 2021 Quentin Gruber
//   copyright (C) 2021 - 2024 H1emu community
//
//   https://github.com/QuentinGruber/h1z1-server
//   https://www.npmjs.com/package/h1z1-server
//
//   Based on https://github.com/psemu/soe-network
// ======================================================================

import { DB_COLLECTIONS } from "../../../utils/enums";
import { ZoneClient2016 } from "../classes/zoneclient";
import { ZoneServer2016 } from "../zoneserver";
import { Collection } from "mongodb";

export enum ChallengeType {
  NONE = 0,
  WOOD = 1
}
export enum ChallengeStatus {
  CURRENT = 1,
  DONE = 2,
  TIMED_OUT = 3
}
export interface ChallengeInfo {
  type: ChallengeType;
  name: string;
  description: string;
  neededPoints: number;
}
export interface ChallengeData {
  _id?: string;
  serverId: number;
  playerGuid: string;
  type: ChallengeType;
  status: ChallengeStatus;
  points: number;
}

export class ChallengeManager {
  challenges: ChallengeInfo[];
  challengesCollection!: Collection<ChallengeData>;
  constructor(public server: ZoneServer2016) {
    this.challenges = [
      {
        type: ChallengeType.WOOD,
        name: "wood",
        description: "Cut 10 trees",
        neededPoints: 10
      }
    ];
    this.challengesCollection = this.server._db.collection<ChallengeData>(
      DB_COLLECTIONS.CHALLENGES
    );
  }

  getChallengeInfo(type: ChallengeType): ChallengeInfo | undefined {
    return this.challenges.find((e: ChallengeInfo) => e.type === type);
  }

  async loadChallenges(client: ZoneClient2016) {
    const currentChallenge = await this.getCurrentChallengeData(client);
    if (!currentChallenge) {
      this.affectChallenge(client);
    } else {
      this.displayChallengeInfos(client);
    }
  }

  async getCurrentChallengeData(
    client: ZoneClient2016
  ): Promise<ChallengeData | undefined> {
    const challengeInfo = this.getChallengeInfo(
      client.character.currentChallenge
    );
    if (challengeInfo) {
      if (this.server._soloMode) {
        this.server.sendAlert(
          client,
          "Challenges aren't available for solomode yet."
        );
      } else {
        const challengeData = await this.challengesCollection.findOne({
          type: challengeInfo.type,
          status: ChallengeStatus.CURRENT,
          serverId: this.server._worldId,
          playerGuid: client.loginSessionId
        });
        return challengeData ?? undefined;
      }
    }
  }

  displayChallengeInfos(client: ZoneClient2016) {
    const message = "nothing";
    this.server.sendAlert(client, message);
  }

  async registerChallengeProgression(
    client: ZoneClient2016,
    pointsToAdd: number
  ) {
    // if challenge ended
    const currentChallenge = await this.getCurrentChallengeData(client);
    if (!currentChallenge) {
      this.server.sendAlert(client, "no current challenge");
      return;
    }

    const points = currentChallenge.points + pointsToAdd;
    const challengeInfo = this.getChallengeInfo(currentChallenge.type);
    if (!challengeInfo) {
      return;
    }

    if (points >= challengeInfo.neededPoints) {
      this.finishChallenge(client);
    }

    if (this.server._soloMode) {
      // nothing
    } else {
      this.challengesCollection.updateOne(
        { _id: currentChallenge._id },
        { $set: { points } }
      );
    }
  }

  finishChallenge(client: ZoneClient2016) {
    this.affectChallenge(client);
  }

  async affectChallenge(client: ZoneClient2016) {
    //  TODO: Check if player have done less than 3 challenge during the current day
    // if he hasn't affect randomly a new challenge not in the one he has done today
    const challenges_available = this.challenges;
    const rnd_index = 0; // TODO:
    const challenge = challenges_available[rnd_index];

    const challengeData: ChallengeData = {
      serverId: this.server._worldId,
      type: challenge.type,
      status: ChallengeStatus.CURRENT,
      playerGuid: client.loginSessionId,
      points: 0
    };

    await this.challengesCollection.insertOne(challengeData);

    client.character.currentChallenge = challenge.type;
    this.displayChallengeInfos(client);
  }
}
