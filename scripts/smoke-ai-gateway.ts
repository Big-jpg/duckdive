import {streamText} from "ai";

const result=streamText({
  model:"openai/gpt-5.6-sol",
  prompt:"Reply with one short sentence confirming that DuckDive AI Gateway streaming is working.",
  abortSignal:AbortSignal.timeout(60_000),
});

for await(const textPart of result.textStream)process.stdout.write(textPart);
process.stdout.write("\n");
