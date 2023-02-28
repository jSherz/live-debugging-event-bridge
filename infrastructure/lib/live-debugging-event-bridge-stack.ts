import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Api } from "./api";
import { DemoEventBus } from "./demo-event-bus";
import { EventGeneratorLambda } from "./event-generator-lambda";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LiveDebuggingEventBridgeStackProps extends cdk.StackProps {}

export class LiveDebuggingEventBridgeStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: LiveDebuggingEventBridgeStackProps,
  ) {
    super(scope, id, props);

    const demoEventBus = new DemoEventBus(this, "demo-event-bus");

    new EventGeneratorLambda(this, "event-generator-lambda-construct", {
      eventBusArn: demoEventBus.eventBus.eventBusArn,
    });

    new Api(this, "api");
  }
}
