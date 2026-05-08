import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      ((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }) as typeof requestAnimationFrame,
    );

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
  });

  it("switches to the table row scenario", () => {
    render(React.createElement(App));

    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "table-rows" },
    });

    expect(screen.getAllByText("Table Rows Demo")).not.toHaveLength(0);
    expect(screen.getAllByText("Channel")).not.toHaveLength(0);
    expect(screen.getByRole("option", { name: "Table Rows" })).toBeInTheDocument();
  });
});
