import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GameTable } from "./GameTable";

const toast = Object.assign(vi.fn(), {
  error: vi.fn(),
  success: vi.fn(),
});

vi.mock("sonner", () => ({
  toast,
}));

describe("GameTable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.mockClear();
    toast.error.mockClear();
    toast.success.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("does not reopen the winner dialog while the next round is starting", async () => {
    render(<GameTable names={["A", "B", "C"]} boot={1} maxBet={10} onExit={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /fold/i }));
    fireEvent.click(screen.getByRole("button", { name: /fold/i }));

    expect(await screen.findByRole("heading", { name: /round winner/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /award pot & next round/i }));

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole("heading", { name: /round winner/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Round 2/)).toBeInTheDocument();
    expect(screen.queryByText(/^Round 2$/)).not.toBeInTheDocument();
    expect(screen.getByText(/^Round 1$/)).toBeInTheDocument();
  });
});
