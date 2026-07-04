/**
 * Trimmed model of the SAP S/4HANA Business Partner OData API
 * (API_BUSINESS_PARTNER). Only the A_Supplier fields used by the vendor
 * sync are declared. In a real project run:
 *   cds import API_BUSINESS_PARTNER.edmx --as cds
 * after downloading the metadata from the SAP Business Accelerator Hub.
 */
@cds.external
service API_BUSINESS_PARTNER {
  entity A_Supplier {
    key Supplier              : String(10);
        BusinessPartnerName   : String(81);
        OrganizationBPName1   : String(40);
        SupplierName          : String(80);
        EmailAddress          : String(241);
        PhoneNumber           : String(30);
        StreetName            : String(60);
        CityName              : String(40);
        Country               : String(3);
        Currency              : String(5);
        TaxNumber1            : String(20);
        BusinessPartnerTaxNumber : String(20);
  }
}
