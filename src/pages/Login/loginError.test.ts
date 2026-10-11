import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { localLoginErrorMessage } from "./loginError";

describe("localLoginErrorMessage", () => {
  it("leaves network failures to the global error notification", () => {
    expect(localLoginErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"), "Login failed")).toBeNull();
  });

  it("keeps invalid credentials local to the login form", () => {
    const error = new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message: "Invalid username or password" },
    });

    expect(localLoginErrorMessage(error, "Login failed")).toBe("Invalid username or password");
  });
});
