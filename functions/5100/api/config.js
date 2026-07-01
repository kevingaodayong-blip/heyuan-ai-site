import worker from "../../_lib/5100-worker.js";

export async function onRequestGet(context) {
  return worker.fetch(context.request, {});
}
