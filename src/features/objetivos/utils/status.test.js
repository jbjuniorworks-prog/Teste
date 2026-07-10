import { calcularStatus } from "./status";

const DIA_MS = 86400000;

describe("calcularStatus", () => {
  it("returns null when the goal is already complete", () => {
    const objetivo = { created_at: new Date(0).toISOString() };
    expect(calcularStatus(objetivo, 100, 200 * DIA_MS)).toBeNull();
  });

  it("returns null when there is no created_at to compare against", () => {
    expect(calcularStatus({}, 5, 1_000_000)).toBeNull();
  });

  it("returns 'ativo' for a recently created goal with low progress", () => {
    const agora = 10 * DIA_MS;
    const objetivo = { created_at: new Date(0).toISOString() };
    expect(calcularStatus(objetivo, 5, agora)).toBe("ativo");
  });

  it("returns 'ativo' for an old goal that already has good progress", () => {
    const agora = 90 * DIA_MS;
    const objetivo = { created_at: new Date(0).toISOString() };
    expect(calcularStatus(objetivo, 40, agora)).toBe("ativo");
  });

  it("returns 'parado' for an old goal with little progress", () => {
    const agora = 45 * DIA_MS;
    const objetivo = { created_at: new Date(0).toISOString() };
    expect(calcularStatus(objetivo, 5, agora)).toBe("parado");
  });

  it("is not 'parado' right at the boundary before 30 days have passed", () => {
    const agora = 29 * DIA_MS;
    const objetivo = { created_at: new Date(0).toISOString() };
    expect(calcularStatus(objetivo, 5, agora)).toBe("ativo");
  });
});
