/// <reference lib="webworker" />
import { runRegex } from '@sakura-tools/tools/regex';

export interface RegexJob {
  id: number;
  pattern: string;
  flags: string;
  text: string;
}

self.onmessage = (e: MessageEvent<RegexJob>) => {
  const { id, pattern, flags, text } = e.data;
  self.postMessage({ id, result: runRegex(pattern, flags, text) });
};
