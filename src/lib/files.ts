import { createSHA256 } from 'hash-wasm';
import type { FileKind } from '../types';

const MAX_FILE_SIZE = 1024 * 1024 * 1024;

function extensionOf(name: string): string {
  return name.toLowerCase().split('.').pop() ?? '';
}

function looksLikeCsv(text: string): boolean {
  if (!text.trim() || text.includes('\u0000') || /^\s*</.test(text)) {
    return false;
  }
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 8);
  if (lines.length < 2) {
    return false;
  }
  const delimiters = [',', ';', '\t', '|'];
  return delimiters.some((delimiter) => {
    const counts = lines.map((line) => line.split(delimiter).length);
    return (counts[0] ?? 0) > 1 && counts.every((count) => count === counts[0]);
  });
}

export async function detectFileKind(file: File): Promise<FileKind> {
  if (file.size === 0) {
    throw new Error('The file is empty.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Files above 1 GB exceed the browser-safe limit for this release.');
  }

  const extension = extensionOf(file.name);
  const first = new Uint8Array(await file.slice(0, Math.min(file.size, 64 * 1024)).arrayBuffer());

  if (extension === 'parquet') {
    const last = new Uint8Array(await file.slice(Math.max(0, file.size - 4)).arrayBuffer());
    const hasMagic =
      first[0] === 0x50 &&
      first[1] === 0x41 &&
      first[2] === 0x52 &&
      first[3] === 0x31 &&
      last[0] === 0x50 &&
      last[1] === 0x41 &&
      last[2] === 0x52 &&
      last[3] === 0x31;
    if (!hasMagic) {
      throw new Error('This .parquet file does not contain a valid Parquet signature.');
    }
    return 'parquet';
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(first);
  const trimmed = text.trimStart();

  if (extension === 'json' || extension === 'jsonl' || extension === 'ndjson') {
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      throw new Error('The file extension says JSON, but the content does not look like JSON.');
    }
    return 'json';
  }

  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    if (!looksLikeCsv(text)) {
      throw new Error(
        'The file extension says tabular text, but no consistent delimiter was found.',
      );
    }
    return 'csv';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  if (looksLikeCsv(text)) {
    return 'csv';
  }

  throw new Error('Unsupported or spoofed file type. Use CSV, TSV, JSON, JSONL, or Parquet.');
}

export async function fingerprintFile(file: File): Promise<string> {
  const hasher = await createSHA256();
  const reader = file.stream().getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      hasher.update(value);
    }
    return hasher.digest('hex');
  } finally {
    reader.releaseLock();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
