import * as cdk from "aws-cdk-lib";
import { aws_events, aws_events_targets } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Api } from "./api";
import { DemoEventBus } from "./demo-event-bus";
import { EventGeneratorLambda } from "./event-generator-lambda";
import { EventListenerLambda } from "./event-listener-lambda";

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

    const api = new Api(this, "api");

    const eventListenerLambda = new EventListenerLambda(
      this,
      "event-listener-lambda-construct",
      {
        usersTable: api.usersTable,
        apiCallbackUrl: api.callbackUrl,
        apiId: api.id,
      },
    );

    new aws_events.Rule(this, "capture-all-demo-events", {
      eventBus: demoEventBus.eventBus,
      targets: [
        new aws_events_targets.LambdaFunction(eventListenerLambda.lambda, {
          retryAttempts: 3,
        }),
      ],
      /*
        Customise the filtering to only send some events to the WebSocket API.
       */
      eventPattern: {
        version: ["0"],
        detailType: ["PRODUCT_CREATED", "PRODUCT_UPDATED"],
        source: ["event-generator-lambda"],
      },
    });
  }
}
