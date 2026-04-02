export interface MemoryRetrievedItem {
  content: string;
  score: number;
  document_id: string;
}

export interface MemorySourceResult {
  source_type: 'knowledge' | 'memory';
  container_id: string;
  items: MemoryRetrievedItem[];
}

export interface RagContextRetrievedEvent {
  conversation_id: string;
  sources: MemorySourceResult[];
}

/**
 * Build a `<memory-retrieval>` custom tag for markstream-react rendering.
 * Includes `data-aqbot` attribute to distinguish from AI-generated content.
 */
export function buildMemoryTag(
  status: 'searching' | 'done' | 'error',
  sources?: MemorySourceResult[],
): string {
  if (status === 'searching') {
    return '<memory-retrieval status="searching" data-aqbot="1"></memory-retrieval>';
  }
  if (status === 'error') {
    return '<memory-retrieval status="error" data-aqbot="1"></memory-retrieval>';
  }
  const json = JSON.stringify(sources ?? []);
  return `<memory-retrieval status="done" data-aqbot="1">\n${json}\n</memory-retrieval>\n\n`;
}
