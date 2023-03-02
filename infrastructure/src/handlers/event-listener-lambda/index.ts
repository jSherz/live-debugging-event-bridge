import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { USERS } from "../../util/table-keys";

const TABLE_NAME = process.env.TABLE_NAME;
const API_URL = process.env.API_URL;

if (!TABLE_NAME) {
  throw new Error("You must specify a TABLE_NAME!");
}

if (!API_URL) {
  throw new Error("You must specify an API_URL!");
}

const dynamoDbClient = new DynamoDBClient({});

const apiGatewayManagementClient = new ApiGatewayManagementApiClient({
  endpoint: API_URL,
});

export async function handler(event: unknown) {
  console.log(event);
  console.log(JSON.stringify(event));

  const userData = await dynamoDbClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        id: {
          S: USERS,
        },
      },
    }),
  );

  if (
    userData &&
    userData.Item &&
    userData.Item.users.L &&
    userData.Item.users.L.length >= 1
  ) {
    const users = userData.Item.users.L;

    for (const user of users) {
      await apiGatewayManagementClient.send(
        new PostToConnectionCommand({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ConnectionId: user.M!.connectionId.S!,
          Data: Buffer.from(JSON.stringify(event), "utf-8"),
        }),
      );
    }
  } else {
    console.log("no users - nothing to do");
  }
}
