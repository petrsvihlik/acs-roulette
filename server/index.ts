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
  process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

declare interface PriorityItem {
  priority: number;
  user: CommunicationUserToken;
}

declare interface StartResponse {
  status: string;
  user?: CommunicationUserToken;
  callee?: string;
}

// Instantiate the identity client
if (connectionString === undefined) {
  throw new Error("Connection string must be initialized!");
}

const identityClient = new CommunicationIdentityClient(connectionString);
const queue = new PriorityQueue({
  comparator (a: PriorityItem, b: PriorityItem) {
    return b.priority - a.priority;
  },
});

// define a route handler for the default home page
app.get("/", (req, res) => {
  const fi = queue.length > 0 ? queue.peek() : null;
  const response = { queueLength: queue.length, firstItem: fi };

  res.send(response);
});

app.get("/start", async (req, res) => {
  const identityTokenResponse = await identityClient.createUserAndToken(["voip"]);

  if (queue.length === 0) {
    queue.queue({ priority: 2, user: identityTokenResponse });
    const response: StartResponse = {
      status: "waiting",
      user: identityTokenResponse,
    };
    res.send(response);
  } else {
    const item: PriorityItem = queue.dequeue();
    const response: StartResponse = {
      status: "ready",
      user: identityTokenResponse,
      callee: item.user.user.communicationUserId,
    };
    res.send(response);
  }
});


app.get("/next", async (req, res) => {
  const userId: string = req.headers.userId as string;
  if (userId === undefined) {
    res.status(500).send({ error: "The 'userId' header must be set!" });
    return;
  }

  let response: StartResponse = {
    status: "waiting",
  };

  if (queue.length > 0) {
    let item: PriorityItem = queue.peek();
    if (item.user.user.communicationUserId !== userId) {
      item = queue.dequeue();

      response = {
        status: "ready",
        callee: item.user.user.communicationUserId,
      };
    }
  }
  res.send(response);
});

app.get("/stop", async (req, res) => {
  const userId: string = req.headers.userId as string;
  if (userId === undefined) {
    res.status(500).send({ error: "The 'userId' header must be set!" });
    return;
  }
  identityClient.deleteUser({ communicationUserId: userId });
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
