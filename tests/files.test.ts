import { describe, expect, it } from 'vitest';
import { detectFileKind, fingerprintFile, formatBytes } from '../src/lib/files';

describe('file validation', () => {
  it('accepts a consistent CSV and JSON array', async () => {
    await expect(
      detectFileKind(new File(['name,value\nA,1\nB,2'], 'good.csv', { type: 'text/csv' })),
    ).resolves.toBe('csv');
    await expect(
      detectFileKind(new File(['[{"name":"A"}]'], 'good.json', { type: 'application/json' })),
    ).resolves.toBe('json');
  });

  it('sniffs extensionless JSON and delimited text', async () => {
    await expect(detectFileKind(new File(['{"name":"A"}'], 'payload'))).resolves.toBe('json');
    await expect(detectFileKind(new File(['name|value\nA|1\nB|2'], 'payload'))).resolves.toBe(
      'csv',
    );
  });

  it('accepts a file with valid Parquet boundary signatures', async () => {
    const bytes = new Uint8Array([0x50, 0x41, 0x52, 0x31, 1, 2, 0x50, 0x41, 0x52, 0x31]);
    await expect(detectFileKind(new File([bytes], 'tiny.parquet'))).resolves.toBe('parquet');
  });

  it('accepts DuckDB magic bytes at the storage header offset', async () => {
    const bytes = new Uint8Array(16);
    bytes.set([0x44, 0x55, 0x43, 0x4b], 8);
    await expect(detectFileKind(new File([bytes], 'catalog.duckdb'))).resolves.toBe('duckdb');
  });

  it('rejects HTML renamed to CSV', async () => {
    await expect(
      detectFileKind(new File(['<script>alert(1)</script>'], 'attack.csv', { type: 'text/csv' })),
    ).rejects.toThrow('no consistent delimiter');
  });

  it('rejects a spoofed parquet extension without both signatures', async () => {
    await expect(
      detectFileKind(new File(['PAR1not really parquet'], 'attack.parquet')),
    ).rejects.toThrow('valid Parquet signature');
  });

  it('rejects a spoofed DuckDB extension without the storage signature', async () => {
    await expect(
      detectFileKind(new File(['not really a database'], 'attack.duckdb')),
    ).rejects.toThrow('valid DuckDB signature');
  });

  it('rejects empty, unsupported, and oversized files with bounded errors', async () => {
    await expect(detectFileKind(new File([], 'empty.csv'))).rejects.toThrow('empty');
    await expect(detectFileKind(new File(['hello world'], 'unknown.bin'))).rejects.toThrow(
      'Unsupported or spoofed',
    );
    await expect(detectFileKind({ size: 1024 * 1024 * 1024 + 1 } as File)).rejects.toThrow(
      'above 1 GB',
    );
  });

  it('hashes a file incrementally', async () => {
    const bytes = new TextEncoder().encode('abc');
    const file = {
      stream: () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
    } as File;
    await expect(fingerprintFile(file)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('formats user-facing byte counts', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1_024)).toBe('1.00 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });
});
