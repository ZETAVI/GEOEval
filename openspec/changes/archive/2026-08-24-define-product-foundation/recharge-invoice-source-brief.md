# Source Brief: Electronic ordinary-invoice request fields

- Decision: The smallest purchaser and delivery information needed for GEOEval's
  recharge-order invoice request
- Affected change: `define-product-foundation`
- Researched: 2026-08-18
- Status: Product field boundary confirmed; company invoice-operator validation
  remains before implementation

## Recommendation

Keep the customer form conditional and short:

- purchaser-title type: individual or enterprise;
- individual title: purchaser name;
- enterprise title: enterprise name and unified social credit code or taxpayer
  identification number;
- common delivery field: email address.

Do not require address, telephone, opening bank, or bank account for the initial
electronic ordinary-invoice route. Do not require a natural person's identity
number merely to issue and deliver the invoice by email; it is relevant only if
the customer asks for automatic collection in a personal invoice folder.

## Decision Constraints

- Email is the initial delivery method. A separate invoice-contact mobile is not
  collected; manual correction contact reuses the account mobile.
- Operations sends the completed invoice directly by email outside the product;
  the product records the uploaded result and confirmation but does not send the
  invoice email.
- The company-owned invoice item and tax treatment are not customer-selectable
  fields in this product discussion.
- The actual company invoicing process must accept the selected minimum fields
  before implementation begins.

## Evidence

| Claim | Primary source | Date | Design implication |
| --- | --- | --- | --- |
| Digital invoices include electronic ordinary and special invoices as distinct categories, and their basic face content includes purchaser information. | [State Taxation Administration Announcement No. 11 of 2024](https://fgk.chinatax.gov.cn/zcfgk/c100012/c5236067/content.html) | Published 2024; accessed 2026-08-18 | The product can explicitly limit its first route to electronic ordinary invoices. |
| The purchaser and seller information shown on a digital invoice is name and taxpayer identification number; invoices can also be delivered by email, QR code, or exported file. | [State Taxation Administration Liaoning digital-invoice FAQ](https://liaoning.chinatax.gov.cn/art/2025/5/7/art_782_146440.html) | Published 2025-05-07; accessed 2026-08-18 | Enterprise name and taxpayer ID are the core company-title fields, while email is a separate delivery field. |
| A natural-person invoice can use the person's name as its title; a natural-person taxpayer ID is needed when the purchaser wants the invoice collected in the personal invoice folder, while an individual business uses its unified social credit code or taxpayer ID. | [Guangxi Tax 12366 natural-person invoice guidance](https://znhd.guangxi.chinatax.gov.cn/nsfw/nszx/rdwd/202502/t20250212_412939.html) | Published 2025-02-12; accessed 2026-08-18 | A simple email-delivery route need not force identity-number collection from every individual purchaser. |

## Unknowns and Validation

- Finance or invoice operator: validate the proposed field set against the
  company's actual invoice-issuing workflow before implementation.
