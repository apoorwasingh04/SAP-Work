/**
 * OPA5 integration journey (browser test). Run with the UI5 Test Runner / karma
 * against the deployed gateway (e.g. `ui5 serve` + opaTests.qunit.html). This is
 * the end-to-end UI complement to the Jest unit tests, kept here as a template.
 */
sap.ui.define([
  "sap/ui/test/opaQunit",
  "sap/ui/test/Opa5"
], function (opaTest, Opa5) {
  "use strict";

  Opa5.extendConfig({ autoWait: true, timeout: 30 });

  QUnit.module("Invoice List Journey");

  opaTest("shows the invoice list report with data", function (Given, When, Then) {
    Given.iStartMyAppInAFrame("../../index.html");

    Then.waitFor({
      controlType: "sap.m.Table",
      success: function () { Opa5.assert.ok(true, "Invoice table rendered"); },
      errorMessage: "Invoice table not found"
    });

    Then.iTeardownMyApp();
  });

  opaTest("filters by status = SUBMITTED", function (Given, When, Then) {
    Given.iStartMyAppInAFrame("../../index.html");

    // Placeholder: select the Status filter, choose SUBMITTED, press Go, assert rows.
    Then.waitFor({
      controlType: "sap.m.Table",
      success: function () { Opa5.assert.ok(true, "Filtered list rendered"); }
    });

    Then.iTeardownMyApp();
  });
});
