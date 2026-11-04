import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "next-themes";
import { GameTable } from "../GameTable";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

describe("GameTable", () => {
  it("deducts the final iteration's bets when the pot is auto-awarded", async () => {
    render(
      <ThemeProvider attribute="class">
        <GameTable names={["A", "B", "C"]} boot={1} maxBet={100} mode="manual" onExit={() => {}} />
      </ThemeProvider>
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getAllByRole("spinbutton")[0], { target: { value: "20" } });
    fireEvent.click(within(dialog).getByTitle("Fold B"));
    fireEvent.click(within(dialog).getByTitle("Fold C"));
    fireEvent.click(within(dialog).getByRole("button", { name: /submit iteration/i }));

    // Pot = 3 boot + 20 = 23 to A. A paid 21 → net +2; B, C paid boot → -1 each.
    // Round 2 boots are then deducted, so cards show +1 / -2 / -2.
    expect(await screen.findAllByText("+₹1")).toHaveLength(1);
    expect(screen.getAllByText("-₹2")).toHaveLength(2);
  });

  it("auto mode: a manually opened winner dialog can be cancelled", () => {
    render(
      <ThemeProvider attribute="class">
        <GameTable names={["A", "B", "C"]} boot={1} maxBet={100} mode="auto" onExit={() => {}} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /declare winner/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ending the game shows settlement, and Back to game returns to the table", async () => {
    render(
      <ThemeProvider attribute="class">
        <GameTable names={["A", "B", "C"]} boot={1} maxBet={100} mode="auto" onExit={() => {}} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /end game/i }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /end & settle/i }));
    expect(await screen.findByText("Game Over")).toBeInTheDocument();
    expect(screen.getByText(/everyone is even/i)).toBeInTheDocument(); // round 1 boots refunded
    fireEvent.click(screen.getByRole("button", { name: /back to game/i }));
    expect(screen.queryByText("Game Over")).not.toBeInTheDocument();
    expect(screen.getByText("Current Turn")).toBeInTheDocument();
  });

  it("keyboard shortcuts act for the current player and Ctrl+Z undoes", () => {
    render(
      <ThemeProvider attribute="class">
        <GameTable names={["A", "B", "C"]} boot={1} maxBet={100} mode="auto" onExit={() => {}} />
      </ThemeProvider>
    );
    const turn = () => screen.getByText("Current Turn").nextElementSibling?.textContent;
    expect(turn()).toBe("A");
    fireEvent.keyDown(window, { key: "b" });
    expect(turn()).toBe("B");
    fireEvent.keyDown(window, { key: "f" });
    expect(turn()).toBe("C");
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(turn()).toBe("B");
    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    // shortcuts are suspended while a dialog is open
    fireEvent.keyDown(window, { key: "b" });
    expect(turn()).toBe("B");
  });
});
