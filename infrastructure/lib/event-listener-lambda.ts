import { Aws, aws_lambda_nodejs, Duration } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { SourceMapMode } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

export interface IEventListenerLambdaProps {
  usersTable: ITable;
  apiCallbackUrl: string;
  apiId: string;
}

export class EventListenerLambda extends Construct {
  public readonly lambda: IFunction;

  constructor(scope: Construct, id: string, props: IEventListenerLambdaProps) {
    super(scope, id);

    this.lambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      "event-listener-lambda",
      {
        functionName: "live-event-bridge-debugging-event-listener",
        description:
          "Receives events from Event Bridge and sends them to users of the WebSocket API.",
        timeout: Duration.seconds(15),
        memorySize: 256,
        logRetention: RetentionDays.FIVE_DAYS,
        architecture: Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "src",
          "handlers",
          "event-listener-lambda",
          "index.ts",
        ),
        handler: "handler",
        runtime: Runtime.NODEJS_18_X,
        awsSdkConnectionReuse: true,
        depsLockFilePath: "yarn.lock",
        bundling: {
          minify: true,
          sourceMap: true,
          sourceMapMode: SourceMapMode.INLINE,
        },
        environment: {
          TABLE_NAME: props.usersTable.tableName,
          API_URL: props.apiCallbackUrl,
        },
      },
    );

    this.lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "AllowFetchingUsers",
        effect: Effect.ALLOW,
        actions: ["dynamodb:GetItem"],
        resources: [props.usersTable.tableArn],
      }),
    );

    this.lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "AllowSendingDataToWebSocketUsers",
        effect: Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${Aws.REGION}:${Aws.ACCOUNT_ID}:${props.apiId}/*`,
        ],
      }),
    );
  }
}
