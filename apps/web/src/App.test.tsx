import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("switches to the nested layout scenario", () => {
    render(React.createElement(App));

    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "nested-layout" },
    });

    expect(screen.getAllByText("Nested Layout Demo")).not.toHaveLength(0);
    expect(screen.getAllByText("Prescription Layout")).not.toHaveLength(0);
    expect(screen.getAllByText("Facid HC 2% / 1% Cream")).not.toHaveLength(0);
  });

  it("updates the scale slider", () => {
    render(React.createElement(App));

    const scale = screen.getByLabelText("Scale");
    fireEvent.change(scale, { target: { value: "80" } });

    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(scale).toHaveValue("80");
  });
});
