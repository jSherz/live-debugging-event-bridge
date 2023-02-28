import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const client = new EventBridgeClient({});

const PRODUCTS = [
  "MOBILE_PHONE",
  "SINGLE_FLIP_FLOP",
  "RIGHT_ANGLED_SCREWDRIVER",
  "LEMON_SQUEEZER",
  "OBSERVABILITY_BOOK",
  "SOCKET_TESTER",
];

const COLOURS = [
  "lemon",
  "pearlescent-purple",
  "mint",
  "blue",
  "royal-blue",
  "not-very-blue",
  "extra-medium-grey",
];

const NUM_EVENTS_TO_CREATE = 10;

/**
 * We want to show events coming in live at different times, so we artificially
 * slow down our Lambda function with a sleep.
 *
 * @param timeMs
 */
function sleep(timeMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeMs));
}

/**
 * An easy way for us to send some events with different data.
 */
function randomProduct() {
  return {
    name: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)],
    priceInPence: Math.random() * 10000,
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
  };
}

export async function handler() {
  for (let i = 0; i < NUM_EVENTS_TO_CREATE; i++) {
    const entry = {
      Source: "event-generator-lambda",
      DetailType: Math.random() > 0.95 ? "PRODUCT_CREATED" : "PRODUCT_UPDATED",
      Detail: JSON.stringify(randomProduct()),
      EventBusName: "live-debugging-event-bridge",
    };

    /*
      We only send one event at once to let the delaying take effect and thus
      make this a (slightly) more realistic demo.
     */
    await client.send(
      new PutEventsCommand({
        Entries: [entry],
      }),
    );

    console.log("Sent event:", JSON.stringify(entry));

    if (i !== NUM_EVENTS_TO_CREATE - 2) {
      const timeToSleep = Math.floor(Math.random() * 20000 + 2000);

      console.log(`Sleeping for ${timeToSleep}ms.`);
      await sleep(timeToSleep);
    }
  }
}
