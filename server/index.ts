import express from "express";
import PriorityQueue from "ts-priority-queue";
import {
  CommunicationAccessToken,
  CommunicationIdentityClient,
  CommunicationUserToken,
} from "@azure/communication-identity";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // default port to listen

const connectionString =
  process.env["COMMUNICATION_SERVICES_CONNECTION_STRING"];

declare interface PriorityItem {
  priority: number;
  user: CommunicationUserToken;
}

declare interface StartResponse {
  status: string;
  user: CommunicationUserToken;
  callee?: string;
}

// Instantiate the identity client
if (connectionString === undefined) {
  throw new Error("Connection string must be initialized!");
}

const identityClient = new CommunicationIdentityClient(connectionString);
var queue = new PriorityQueue({
  comparator: function (a: PriorityItem, b: PriorityItem) {
    return b.priority - a.priority;
  },
});

// define a route handler for the default home page
app.get("/", (req, res) => {
  let fi = queue.length > 0 ? queue.peek() : null;
  let response = { queueLength: queue.length, firstItem: fi };

  res.send(response);
});

app.get("/start", async (req, res) => {
  let identityTokenResponse = await identityClient.createUserAndToken(["voip"]);

  if (queue.length == 0) {
    queue.queue({ priority: 2, user: identityTokenResponse });
    let response: StartResponse = {
      status: "waiting",
      user: identityTokenResponse,
    };
    res.send(response);
  } else {
    let item: PriorityItem = queue.dequeue();
    let response: StartResponse = {
      status: "ready",
      user: identityTokenResponse,
      callee: item.user.user.communicationUserId,
    };
    res.send(response);
  }
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
