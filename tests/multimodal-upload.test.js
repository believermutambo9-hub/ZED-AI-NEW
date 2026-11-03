import test from "node:test";
import assert from "node:assert/strict";
import { prepareUploadedFile, detectUploadedSignature } from "../features/file-analysis.js";

function upload(name, mimeType, bytes) {
  const base64 = Buffer.from(bytes).toString("base64");
  return prepareUploadedFile({
    name,
    type: mimeType,
    data: `data:${mimeType};base64,${base64}`
  });
}

test("audio uploads are accepted only when filename, MIME type and signature agree", async () => {
  const mp3 = await upload("voice.mp3", "audio/mpeg", Buffer.from("ID3\x04\x00\x00\x00\x00\x00\x00", "binary"));
  assert.equal(mp3.mediaKind, "audio");
  assert.equal(mp3.mimeType, "audio/mpeg");
  assert.equal(mp3.inlineData.mimeType, "audio/mpeg");
  assert.equal(mp3.extractedText, "");

  const wavBytes = Buffer.alloc(16);
  wavBytes.write("RIFF", 0, "ascii");
  wavBytes.write("WAVE", 8, "ascii");
  const wav = await upload("recording.wav", "audio/wav", wavBytes);
  assert.equal(wav.mediaKind, "audio");
  assert.equal(wav.mimeType, "audio/wav");
});

test("video uploads are accepted for supported container signatures", async () => {
  const mp4Bytes = Buffer.alloc(16);
  mp4Bytes.write("ftyp", 4, "ascii");
  mp4Bytes.write("isom", 8, "ascii");
  const mp4 = await upload("clip.mp4", "video/mp4", mp4Bytes);
  assert.equal(mp4.mediaKind, "video");
  assert.equal(mp4.mimeType, "video/mp4");

  const webmBytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x93, 0x42, 0x82, 0x88]);
  const webm = await upload("clip.webm", "video/webm", webmBytes);
  assert.equal(webm.mediaKind, "video");
  assert.equal(webm.mimeType, "video/webm");
});

test("media extension spoofing and invalid declared MIME types are rejected", async () => {
  const fake = Buffer.from("not an mp3 file");
  await assert.rejects(
    upload("voice.mp3", "audio/mpeg", fake),
    /contents do not match|valid media file/i
  );

  const mp3 = Buffer.from("ID3\x04\x00\x00\x00\x00\x00\x00", "binary");
  await assert.rejects(
    upload("voice.mp3", "video/mp4", mp3),
    /format declared|format does not match|MIME type/i
  );
});

test("media uploads remain subject to the existing 18 MB limit", async () => {
  const tooLarge = Buffer.alloc(18 * 1024 * 1024 + 1);
  tooLarge.write("ID3", 0, "ascii");
  await assert.rejects(
    upload("large.mp3", "audio/mpeg", tooLarge),
    /smaller than 18 MB/i
  );
});

test("signature detection identifies supported media containers", () => {
  assert.equal(detectUploadedSignature(Buffer.from("ID3\x04\x00\x00\x00\x00\x00\x00", "binary")), "audio/mpeg");
  const wav = Buffer.alloc(12);
  wav.write("RIFF", 0, "ascii");
  wav.write("WAVE", 8, "ascii");
  assert.equal(detectUploadedSignature(wav), "audio/wav");
});

test("audio and video inline uploads enforce the smaller provider-safe request limit", async () => {
  const tooLarge = Buffer.alloc(14 * 1024 * 1024 + 1);
  tooLarge.write("ID3", 0, "ascii");
  await assert.rejects(
    upload("long-recording.mp3", "audio/mpeg", tooLarge),
    /14 MB or smaller/i
  );
});

test("M4A and QuickTime MOV files normalize to Gemini-supported media MIME types", async () => {
  const m4aBytes = Buffer.alloc(16);
  m4aBytes.write("ftyp", 4, "ascii");
  m4aBytes.write("M4A ", 8, "ascii");
  const m4a = await upload("voice.m4a", "audio/mp4", m4aBytes);
  assert.equal(m4a.mimeType, "audio/mp4");
  assert.equal(m4a.mediaKind, "audio");

  const movBytes = Buffer.alloc(16);
  movBytes.write("ftyp", 4, "ascii");
  movBytes.write("qt  ", 8, "ascii");
  const mov = await upload("clip.mov", "video/quicktime", movBytes);
  assert.equal(mov.mimeType, "video/mov");
  assert.equal(mov.mediaKind, "video");
});
