import { aws_lambda_nodejs, Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { SourceMapMode } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

interface EventGeneratorLambdaProps {
  eventBusArn: string;
}

export class EventGeneratorLambda extends Construct {
  constructor(scope: Construct, id: string, props: EventGeneratorLambdaProps) {
    super(scope, id);

    const lambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      "event-generator-lambda",
      {
        functionName: "live-event-bridge-debugging-event-generator",
        description:
          "Generates dummy events to send to our testing EventBridge Event Bus.",
        timeout: Duration.seconds(200),
        memorySize: 128,
        logRetention: RetentionDays.FIVE_DAYS,
        architecture: Architecture.ARM_64,
        entry: path.join(
          __dirname,
          "..",
          "src",
          "handlers",
          "event-generator-lambda",
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
      },
    );

    lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "AllowPublishingEvents",
        effect: Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [props.eventBusArn],
      }),
    );
  }
}
