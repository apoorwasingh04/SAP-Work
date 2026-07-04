/**
 * UMD module: usable by SAPUI5 (sap.ui.define) at runtime AND by Node/Jest
 * (module.exports) for unit testing without a browser.
 */
(function (factory) {
  "use strict";
  if (typeof sap !== "undefined" && sap.ui && sap.ui.define) {
    sap.ui.define([], factory);
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  }
}(function () {
  "use strict";

  return {
    // Map invoice status -> sap.ui.core.ValueState (used for semantic colouring)
    statusState: function (status) {
      switch (status) {
        case "APPROVED":
        case "PAID":      return "Success";
        case "SUBMITTED": return "Warning";
        case "REJECTED":  return "Error";
        default:          return "None"; // DRAFT
      }
    },

    // Map invoice status -> criticality (1 negative, 2 critical, 3 positive)
    statusCriticality: function (status) {
      switch (status) {
        case "REJECTED":  return 1;
        case "SUBMITTED": return 2;
        case "APPROVED":
        case "PAID":      return 3;
        default:          return 0;
      }
    },

    statusIcon: function (status) {
      switch (status) {
        case "APPROVED":
        case "PAID":      return "sap-icon://accept";
        case "SUBMITTED": return "sap-icon://pending";
        case "REJECTED":  return "sap-icon://decline";
        default:          return "sap-icon://document";
      }
    },

    // "10000" + "USD" -> "10,000.00 USD"
    formatAmount: function (amount, currency) {
      var n = Number(amount);
      if (isNaN(n)) return "";
      var formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return currency ? formatted + " " + currency : formatted;
    }
  };
}));
