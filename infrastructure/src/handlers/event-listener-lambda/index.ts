const TABLE_NAME = process.env.TABLE_NAME;

if (!TABLE_NAME) {
  throw new Error("You must specify a TABLE_NAME!");
}

export async function handler(event: unknown) {
  console.log(event);
  console.log(JSON.stringify(event));
}
