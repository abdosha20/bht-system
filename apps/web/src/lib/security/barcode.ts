import { createHash } from "crypto";

const prefix = "BHTCL";

export type ParsedBarcode = {
  docUid: string;
  docType: string;
  version: number;
  checksum: string;
};

export function computeBarcodeChecksum(docUid: string, docType: string, version: number, salt: string) {
  const raw = `${docUid}${docType}${version}${salt}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 10);
}

export function buildBarcodePayload(docUid: string, docType: string, version: number, salt: string) {
  const checksum = computeBarcodeChecksum(docUid, docType, version, salt);
  return `${prefix}|${docUid}|${docType}|v${version}|${checksum}`;
}

export function parseAndValidateBarcode(payload: string, salt: string): ParsedBarcode | null {
  const parts = payload.trim().split("|");
  if (parts.length !== 5) {
    return null;
  }

  const [magic, docUid, docType, versionPart, checksum] = parts;
  if (magic !== prefix || !docUid || !docType || !versionPart.startsWith("v") || !checksum) {
    return null;
  }

  const version = Number.parseInt(versionPart.slice(1), 10);
  if (!Number.isInteger(version) || version < 1) {
    return null;
  }

  const expected = computeBarcodeChecksum(docUid, docType, version, salt);
  if (expected !== checksum) {
    return null;
  }

  return { docUid, docType, version, checksum };
}