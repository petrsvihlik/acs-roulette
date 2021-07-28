import express from "express";
import PriorityQueue from "ts-priority-queue";
import {
  CommunicationIdentityClient,
} from "@azure/communication-identity";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // default port to listen

const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

declare interface PriorityItem {
  priority: number;
  userId: string;
}

declare interface StartResponse {
  status: string;
  callee?: string;
}

// Instantiate the identity client
if (connectionString === undefined) {
  throw new Error("Connection string must be initialized!");
}

const identityClient = new CommunicationIdentityClient(connectionString);
const queue = new PriorityQueue({
  comparator(a: PriorityItem, b: PriorityItem) {
    return b.priority - a.priority;
  },
});

// define a route handler for the default home page
app.get("/", (req, res) => {
  const fi = queue.length > 0 ? queue.peek() : null;
  const response = { queueLength: queue.length, firstItem: fi };

  res.send(response);
});

app.get("/init", async (req, res) => {
  const identityTokenResponse = await identityClient.createUserAndToken([
    "voip",
  ]);
  res.send(identityTokenResponse);
});

app.get("/next", async (req, res) => {
  const userId: string = req.header('userId') as string;
  //const priority: number = req.headers.priority as number;

  if (userId === undefined) {
    res.status(500).send({ error: "The 'userId' header must be set!" });
    return;
  }

  let response: StartResponse = {
    status: "waiting",
  };

  if (queue.length > 0) {
    let item: PriorityItem = queue.peek();
    if (item.userId !== userId) {
      item = queue.dequeue();

      response = {
        status: "ready",
        callee: item.userId,
      };
    }
  } else {
    queue.queue({ priority: 2, userId: userId });
  }
  res.send(response);
});

app.get("/stop", async (req, res) => {
  const userId: string = req.header('userId') as string;
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
