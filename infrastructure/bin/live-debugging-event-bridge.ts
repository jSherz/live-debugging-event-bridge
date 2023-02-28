#!/usr/bin/env node
import "source-map-support/register";

import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import { LiveDebuggingEventBridgeStack } from "../lib/live-debugging-event-bridge-stack";

const app = new cdk.App();

const stack = new LiveDebuggingEventBridgeStack(
  app,
  "live-debugging-event-bridge",
  {},
);

Tags.of(stack).add("project", "live-debugging-event-bridge");
