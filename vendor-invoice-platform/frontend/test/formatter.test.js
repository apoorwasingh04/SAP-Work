const formatter = require("../webapp/model/formatter");

describe("formatter.statusState", () => {
  it("maps workflow statuses to UI5 ValueStates", () => {
    expect(formatter.statusState("APPROVED")).toBe("Success");
    expect(formatter.statusState("PAID")).toBe("Success");
    expect(formatter.statusState("SUBMITTED")).toBe("Warning");
    expect(formatter.statusState("REJECTED")).toBe("Error");
    expect(formatter.statusState("DRAFT")).toBe("None");
    expect(formatter.statusState("UNKNOWN")).toBe("None");
  });
});

describe("formatter.statusCriticality", () => {
  it("maps statuses to criticality codes", () => {
    expect(formatter.statusCriticality("REJECTED")).toBe(1);
    expect(formatter.statusCriticality("SUBMITTED")).toBe(2);
    expect(formatter.statusCriticality("APPROVED")).toBe(3);
    expect(formatter.statusCriticality("DRAFT")).toBe(0);
  });
});

describe("formatter.statusIcon", () => {
  it("returns an icon per status", () => {
    expect(formatter.statusIcon("APPROVED")).toBe("sap-icon://accept");
    expect(formatter.statusIcon("REJECTED")).toBe("sap-icon://decline");
    expect(formatter.statusIcon("DRAFT")).toBe("sap-icon://document");
  });
});

describe("formatter.formatAmount", () => {
  it("formats numbers with a currency suffix", () => {
    expect(formatter.formatAmount(10000, "USD")).toBe("10,000.00 USD");
    expect(formatter.formatAmount("2500.5", "EUR")).toBe("2,500.50 EUR");
    expect(formatter.formatAmount(100)).toBe("100.00");
    expect(formatter.formatAmount("not-a-number", "USD")).toBe("");
  });
});
