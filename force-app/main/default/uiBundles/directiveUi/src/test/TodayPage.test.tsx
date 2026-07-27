import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import TodayPage from "@/features/today/TodayPage";

/**
 * TodayPage renders against the mock repositories selected by the factory in
 * mock mode (the default). We assert the greeting renders immediately and the
 * data-driven sections appear once the mock queries resolve.
 */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/today"]}>
          <TodayPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("TodayPage", () => {
  it("shows the greeting header for the running user", async () => {
    renderPage();
    expect(
      await screen.findByRole(
        "heading",
        { name: /Good (morning|afternoon|evening), Jordan/ },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
  });

  it("renders data-driven sections once the mock work loads", async () => {
    renderPage();
    // "Immediate" surfaces the critical seed item once the query resolves.
    expect(
      await screen.findByText("Immediate", undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Recently completed", undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
  });
});
