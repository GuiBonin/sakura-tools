/// <reference lib="webworker" />
import { parseFiscalXml } from '@sakura-tools/fiscal/nfe';
import { formatXml } from '@sakura-tools/tools/xml';

export interface NfeJob {
  xml: string;
}

self.onmessage = (e: MessageEvent<NfeJob>) => {
  const { xml } = e.data;
  const result = parseFiscalXml(xml);
  const formatted = result.ok ? formatXml(xml) : null;
  self.postMessage({ result, formatted: formatted?.ok ? formatted.output : null });
};
