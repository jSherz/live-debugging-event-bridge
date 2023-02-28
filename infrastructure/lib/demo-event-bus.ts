import { aws_events } from "aws-cdk-lib";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";

export class DemoEventBus extends Construct {
  public readonly eventBus: IEventBus;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.eventBus = new aws_events.EventBus(this, "event-bus", {
      eventBusName: "live-debugging-event-bridge",
    });
  }
}
