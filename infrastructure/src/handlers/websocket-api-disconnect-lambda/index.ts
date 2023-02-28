import {
  AttributeValue,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { USERS } from "../../util/table-keys";

const TABLE_NAME = process.env.TABLE_NAME;

if (!TABLE_NAME) {
  throw new Error("You must specify a TABLE_NAME!");
}

interface IEvent {
  headers: Record<string, string>;
  multiValueHeaders: Record<string, string[]>;
  requestContext: {
    routeKey: "$disconnect";
    disconnectStatusCode: number;
    eventType: "DISCONNECT";
    extendedRequestId: string;
    requestTime: string;
    messageDirection: "IN";
    disconnectReason: string;
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

export async function handler(event: IEvent) {
  console.log("handling disconnect event", JSON.stringify(event));

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
    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          id: {
            S: USERS,
          },
          users: {
            L: (existingUsers.Item.users.L as AttributeValue[]).filter(
              (value) => {
                return (
                  value.M?.connectionId.S !== event.requestContext.connectionId
                );
              },
            ),
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
  } else {
    console.log("no existing users - doing nothing");
  }

  return {
    statusCode: 200,
    body: "OK",
  };
}
