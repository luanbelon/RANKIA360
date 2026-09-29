import { describe, expect, it } from "vitest";
import { analyzePublicSite, isPublicAddress } from "./site-audit";

describe("public destination guard", () => {
  it.each([
    "127.0.0.1", "10.0.0.8", "172.16.5.4", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "192.0.2.10", "198.18.0.1", "224.0.0.1", "::1", "fc00::1",
    "fe80::1", "2001:db8::1", "2001:0000::1",
  ])("blocks non-public address %s", address => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"])(
    "allows public address %s",
    address => expect(isPublicAddress(address)).toBe(true),
  );

  it("does not classify non-IP strings as public", () => {
    expect(isPublicAddress("localhost")).toBe(false);
    expect(isPublicAddress("203.0.113.10")).toBe(false);
  });

  it.each(["http://localhost", "http://127.0.0.1", "file:///etc/passwd", "ftp://example.com", "https://user:pass@example.com", "https://example.com:8443"])(
    "rejects unsafe URL before fetching: %s",
    async input => await expect(analyzePublicSite(input)).rejects.toThrow(),
  );
});
