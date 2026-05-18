import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * ─────────────────────────────────────────────────────────────────
 *  CIFRADO DE TOKENS — AES-256-GCM (implementación real)
 * ─────────────────────────────────────────────────────────────────
 *  El access_token de Meta se cifra ANTES de guardarse en la base de
 *  datos y se descifra SOLO en el backend cuando se llama a la API.
 *
 *  TOKEN_ENCRYPTION_KEY debe ser 32 bytes en hex (64 chars). Genera:
 *    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 *  Formato almacenado:  v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 *  ⚠ PUNTO DE CIFRADO: si por algún motivo no hay clave configurada
 *  en desarrollo, se hace un fallback marcado en claro (prefijo
 *  "plain:") SOLO para no romper el flujo local. En producción esto
 *  debe fallar — ver assertEncryptionConfigured().
 * ─────────────────────────────────────────────────────────────────
 */

const ALGO = "aes-256-gcm";
const PREFIX = "v1";
const PLAIN_PREFIX = "plain:";

function getKey(): Buffer | null {
  const raw = env.tokenEncryptionKey;
  if (!raw) return null;
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error(
      "[crypto] TOKEN_ENCRYPTION_KEY debe ser 32 bytes en hex (64 caracteres).",
    );
  }
  return key;
}

/** Úsalo en producción para garantizar que el cifrado está activo. */
export function assertEncryptionConfigured() {
  if (!getKey()) {
    throw new Error(
      "[crypto] TOKEN_ENCRYPTION_KEY no configurada. No se pueden guardar tokens de forma segura.",
    );
  }
}

export function encryptToken(plainText: string): string {
  const key = getKey();
  if (!key) {
    // Fallback de desarrollo claramente marcado. NO usar en prod.
    console.warn(
      "[crypto] ⚠ TOKEN_ENCRYPTION_KEY ausente: el token se guarda SIN cifrar (solo dev).",
    );
    return `${PLAIN_PREFIX}${plainText}`;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptToken(stored: string): string {
  if (stored.startsWith(PLAIN_PREFIX)) {
    return stored.slice(PLAIN_PREFIX.length);
  }
  const key = getKey();
  if (!key) {
    throw new Error(
      "[crypto] Token cifrado pero falta TOKEN_ENCRYPTION_KEY para descifrar.",
    );
  }
  const [version, ivHex, tagHex, dataHex] = stored.split(":");
  if (version !== PREFIX || !ivHex || !tagHex || !dataHex) {
    throw new Error("[crypto] Formato de token cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
