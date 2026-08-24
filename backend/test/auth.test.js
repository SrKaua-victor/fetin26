import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, initTokenSecret, signToken, signAdminToken, verifyToken } from "../src/auth.js";

test("hash de senha aceita a senha correta e rejeita a errada", () => {
  const hash = hashPassword("senha-segura");
  assert.equal(verifyPassword("senha-segura", hash), true);
  assert.equal(verifyPassword("incorreta", hash), false);
});

test("tokens carregam papéis distintos", () => {
  const settings = new Map();
  initTokenSecret({ getSetting: (key) => settings.get(key), setSetting: (key, value) => settings.set(key, value) });
  assert.equal(verifyToken(signToken({ driverId: "d1", name: "Motorista", registration: "1" })).role, "driver");
  assert.equal(verifyToken(signAdminToken("admin")).role, "admin");
  assert.equal(verifyToken("token.invalido"), null);
});
