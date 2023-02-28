import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";

import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {
  aws_dynamodb,
  aws_lambda_nodejs,
  CfnOutput,
  Duration,
} from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ITable,
  TableEncryption,
} from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { SourceMapMode } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

export class Api extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // api.addRoute("sendmessage", {
    //   integration: new WebSocketLambdaIntegration("send-message-integration"),
    // });

    const usersTable = this.createUsersTable();

    const connectLambda = this.createConnectLambda(usersTable);
    const disconnectLambda = this.createDisconnectLambda(usersTable);

    const api = new WebSocketApi(this, "live-debugging-api", {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "connect-lambda",
          connectLambda,
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "disconnect-lamda",
          disconnectLambda,
        ),
      },
    });

    const stage = new WebSocketStage(this, "live-debugging-api-stage", {
      webSocketApi: api,
      autoDeploy: true,
      stageName: "live",
    });

    new CfnOutput(this, "WebSocketApiUrl", {
      value: stage.url,
    });
  }

  private createUsersTable() {
    return new aws_dynamodb.Table(this, "users-table", {
      tableName: "live-debugging-event-bridge-users",
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });
  }

  private createConnectLambda(usersTable: ITable) {
    const lambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      "api-connect-lambda",
      {
        functionName: "live-event-bridge-debugging-api-connect",
        description: "Handles websocket users connecting to the API.",
        timeout: Duration.seconds(15),
        memorySize: 256,
        logRetention: RetentionDays.FIVE_DAYS,
        architecture: Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "src",
          "handlers",
          "websocket-api-connect-lambda",
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
          TABLE_NAME: usersTable.tableName,
        },
      },
    );

    lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "AllowStoringNewUsers",
        effect: Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [usersTable.tableArn],
      }),
    );

    return lambda;
  }

  private createDisconnectLambda(usersTable: ITable) {
    const lambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      "api-disconnect-lambda",
      {
        functionName: "live-event-bridge-debugging-api-disconnect",
        description: "Handles websocket users leaving the API.",
        timeout: Duration.seconds(15),
        memorySize: 256,
        logRetention: RetentionDays.FIVE_DAYS,
        architecture: Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "src",
          "handlers",
          "websocket-api-disconnect-lambda",
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
          TABLE_NAME: usersTable.tableName,
        },
      },
    );

    lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "AllowDeletingUsers",
        effect: Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [usersTable.tableArn],
      }),
    );

    return lambda;
  }
}
