import { act,fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BudgetScreen } from "./BudgetScreen";

describe("BudgetScreen", () => {
  it("renders Budget Screen and progress bar info", () => {
    render(<BudgetScreen />);
    expect(screen.getByText("Budget & Transaction Limits")).toBeInTheDocument();
    expect(screen.getByText(/of budget utilized/i)).toBeInTheDocument();
  });

  it("allows setting a budget limit and warning threshold", () => {
    render(<BudgetScreen />);
    
    // Set budget limit
    const limitInput = screen.getByLabelText("Set Budget Limit ($)");
    fireEvent.change(limitInput, { target: { value: "2000" } });
    expect(screen.getByText(/USDC/i)).toBeInTheDocument(); // breakdowns exist

    // Warn threshold slider
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "85" } });
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("can toggle transaction locking", () => {
    render(<BudgetScreen />);
    
    const checkbox = screen.getByTestId("lock-checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("exports spending reports successfully", async () => {
    vi.useFakeTimers();
    render(<BudgetScreen />);
    
    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    fireEvent.click(exportCsvBtn);

    expect(screen.getByTestId("export-status")).toHaveTextContent("Generating CSV report...");

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("export-status")).toHaveTextContent(/Report exported as sorokit-spending-report.csv/i);
    vi.useRealTimers();
  });

  it("blocks negative budget limits with an inline error", () => {
    render(<BudgetScreen />);
    const limitInput = screen.getByLabelText("Set Budget Limit ($)");
    expect(limitInput).toHaveAttribute("min", "0");

    fireEvent.change(limitInput, { target: { value: "-500" } });
    expect(screen.getByText("Budget limit cannot be negative.")).toBeInTheDocument();
    // Calculations keep using the last valid limit
    expect(screen.getByText(/85\.3% of budget utilized/)).toBeInTheDocument();

    fireEvent.change(limitInput, { target: { value: "0" } });
    expect(screen.getByText("Budget limit must be greater than 0.")).toBeInTheDocument();

    fireEvent.change(limitInput, { target: { value: "2000" } });
    expect(screen.queryByText(/Budget limit (cannot|must)/)).not.toBeInTheDocument();
    expect(screen.getByText(/64\.0% of budget utilized/)).toBeInTheDocument();
  });

  it("shows critical warning badge and banner above 90%", () => {
    render(<BudgetScreen />);
    const limitInput = screen.getByLabelText("Set Budget Limit ($)");
    expect(screen.queryByTestId("budget-alert-banner")).not.toBeInTheDocument();

    fireEvent.change(limitInput, { target: { value: "1400" } }); // 91.4%
    expect(screen.getByText(/Critical/)).toBeInTheDocument();
    expect(screen.getByTestId("budget-alert-banner")).toHaveTextContent(/Warning/);
  });

  it("shows limit exceeded badge and banner at 100%", () => {
    render(<BudgetScreen />);
    const limitInput = screen.getByLabelText("Set Budget Limit ($)");
    fireEvent.change(limitInput, { target: { value: "1280" } }); // exactly 100%
    expect(screen.getByText("Limit Exceeded")).toBeInTheDocument();
    expect(screen.getByTestId("budget-alert-banner")).toHaveTextContent(/Budget exceeded/);
  });
});
