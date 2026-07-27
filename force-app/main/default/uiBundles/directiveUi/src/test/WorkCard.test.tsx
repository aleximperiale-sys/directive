import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkCard } from "@/components/common/WorkCard";
import { WORK_ITEMS } from "@/salesforce/mock/seed";

describe("WorkCard", () => {
  const item = WORK_ITEMS[0];

  it("renders the work item title, band and links to the detail route", () => {
    render(
      <MemoryRouter>
        <WorkCard item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByText(item.title)).toBeInTheDocument();
    // The band appears in the badge (and possibly elsewhere) - assert presence.
    expect(screen.getAllByText(item.priority.band).length).toBeGreaterThan(0);

    const link = screen.getByRole("link", {
      name: new RegExp(`priority ${item.priority.band}`),
    });
    expect(link).toHaveAttribute("href", `/work/${item.id}`);
  });
});
