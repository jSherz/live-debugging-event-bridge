import {
  AttributeValue,
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { sleep } from "../../util/sleep";
import { USERS } from "../../util/table-keys";

const TABLE_NAME = process.env.TABLE_NAME;

if (!TABLE_NAME) {
  throw new Error("You must specify a TABLE_NAME!");
}

export interface IEvent {
  headers: Record<string, string>;
  multiValueHeaders: Record<string, string[]>;
  requestContext: {
    routeKey: "$connect";
    eventType: "CONNECT";
    extendedRequestId: string;
    requestTime: string;
    messageDirection: "IN";
    stage: string;
    connectedAt: number;
    requestTimeEpoch: number;
    identity: {
      userAgent: string;
      sourceIp: string;
    };
    requestId: string;
    domainName: string;
    connectionId: string;
    apiId: string;
  };
  isBase64Encoded: boolean;
}

const client = new DynamoDBClient({});

function eventToItem(event: IEvent) {
  return {
    M: {
      connectionId: {
        S: event.requestContext.connectionId,
      },
      requestId: {
        S: event.requestContext.requestId,
      },
      extendedRequestId: {
        S: event.requestContext.extendedRequestId,
      },
      connectedAt: {
        N: String(event.requestContext.connectedAt),
      },
      requestTimeEpoch: {
        N: String(event.requestContext.requestTimeEpoch),
      },
      userAgent: {
        S: event.requestContext.identity.userAgent,
      },
      sourceIp: {
        S: event.requestContext.identity.sourceIp,
      },
    },
  };
}

export async function handler(event: IEvent) {
  console.log("handling connect event", JSON.stringify(event));

  let successOrFailed = false;

  while (!successOrFailed) {
    const existingUsers = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          id: {
            S: USERS,
          },
        },
      }),
    );

    if (existingUsers.Item) {
      try {
        await client.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
              id: {
                S: USERS,
              },
              users: {
                L: [
                  ...(existingUsers.Item.users.L as AttributeValue[]),
                  eventToItem(event),
                ],
              },
              updatedAt: {
                S: new Date().toISOString(),
              },
            },
            ConditionExpression: "updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":updatedAt": existingUsers.Item.updatedAt,
            },
          }),
        );

        console.log(
          "updated users to include new user",
          event.requestContext.connectionId,
        );

        successOrFailed = true;
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
          console.error("handling conditional check failing gracefully", err);

          await sleep(Math.floor(Math.random() * 5000) + 5000);
        } else {
          throw err;
        }
      }
    } else {
      await client.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: {
            id: {
              S: USERS,
            },
            users: {
              L: [eventToItem(event)],
            },
            updatedAt: {
              S: new Date().toISOString(),
            },
          },
        }),
      );

      console.log("no existing users - record created");

      successOrFailed = true;
    }
  }

  return {
    statusCode: 200,
    body: "OK",
  };
}
