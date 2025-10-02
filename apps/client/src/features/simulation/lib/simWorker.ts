/// <reference lib="webworker" />
import { runMonteCarlo, type EngineOptions, type Inputs } from './monteCarlo';

type MsgIn = { inputs: Inputs; opts?: EngineOptions };
type MsgOut = { ok: true; data: any } | { ok: false; error: string };

self.onmessage = (ev: MessageEvent<MsgIn>) => {
  const { inputs, opts } = ev.data;
  try {
    const data = runMonteCarlo(inputs, opts);
    // Include the original inputs in the response so they're available to components
    const msg: MsgOut = { ok: true, data: { ...data, inputs } };
    // @ts-ignore postMessage exists on DedicatedWorkerGlobalScope
    self.postMessage(msg);
  } catch (err: any) {
    const msg: MsgOut = { ok: false, error: err?.message ?? String(err) };
    // @ts-ignore
    self.postMessage(msg);
  }
};
