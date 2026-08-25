# Source Brief: Domestic RMB withdrawal payee information

- Decision: Which information GEOEval should collect for manually reviewed,
  offline domestic-bank transfers to individual or enterprise agents
- Affected change: `define-product-foundation`
- Researched: 2026-08-18
- Status: Primary-source evidence for product discovery; the company's actual
  bank template still requires validation before launch

## Recommendation

Collect only the payout instructions needed for the initial commission-
withdrawal route. Agent invoice, withholding, taxpayer, and other tax information
is outside the current product boundary.

The payout profile should contain:

- recipient type: individual or enterprise;
- bank-account name, exactly matching the bank account;
- bank-account number;
- bank name;
- opening branch full name for cross-bank or batch-payment routing;
- opening-bank province and city when the selected bank process requires them;
- twelve-digit CNAPS or joint-bank number as a conditional field, preferably
  selected or verified rather than entered as an unvalidated address;
- contact mobile number for payout exceptions.

Do not require a separate physical street address for the opening bank. Official
bank materials consistently use the account name, account number, and opening-
bank information; some cross-bank or batch routes additionally use the branch,
province or city, and CNAPS number. The exact conditional fields must be checked
against the company's actual corporate-bank transfer or batch-payment template.

## Decision Constraints

- The saved bank-account number is sensitive financial-account information.
- Collection must have a specific and necessary payout purpose, use appropriate
  safeguards, disclose necessity and impact, and obtain separate consent when
  consent is the processing basis.
- A withdrawal request keeps a snapshot of the selected payout profile so later
  edits do not rewrite an already reviewed or paid instruction.
- Saved account numbers should be masked outside controlled entry and authorized
  review surfaces.
- Do not collect a bank-card photo, identity document, taxpayer information,
  agent invoice, or opening-bank street address merely because it may be useful
  later.

## Evidence

| Claim | Primary source | Date | Design implication |
| --- | --- | --- | --- |
| A CCB transfer to another bank requires the recipient account number, recipient name, and opening-bank information. Its cross-bank realtime route can select the opening bank without province, city, or specific branch fields. | [China Construction Bank enterprise online-banking FAQ](https://www3.ccb.com/cn/home/question/20130616_1371315280.html) | Published 2014-04-22; accessed 2026-08-18 | Account name, number, and bank are the stable core; detailed routing fields depend on the payment route. |
| CCB's enterprise recipient batch format contains full recipient name, account number, bank, province, city, branch name, and a twelve-digit joint-bank number; the required markers differ by field. | [China Construction Bank enterprise online-banking guide](https://ccb.com/su/share/fhgg/20150720_1437377810/20150720153909659777.pdf) | Accessed 2026-08-18 | Province, city, branch, and bank number should be conditional and validated against the company's actual bank process. |
| CNAPS is a bank-institution code used for interbank fund clearing and can be selected according to the recipient's opening bank. | [Bank of China enterprise online-banking convenience service](https://www.bankofchina.com/big5/ebanking/bocnet_cb/cb8/201002/t20100225_989488.html) | Accessed 2026-08-18 | Use the branch or CNAPS code for routing rather than an unstructured physical address. |
| Financial-account information is sensitive personal information; processing requires a specific purpose, sufficient necessity, strict protection, and separate consent when consent applies, with notice of necessity and impact. | [Personal Information Protection Law, Articles 28–30](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm) | Effective 2021-11-01; accessed 2026-08-18 | Minimize fields, separate consent and notice, mask stored account numbers, and constrain access and retention. |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Core bank fields plus conditional branch or CNAPS fields | Adopt | Matches the variation in official bank transfer routes without forcing irrelevant data. |
| Require opening-bank physical street address | Reject | It is not a stable common routing field and is more error-prone than branch name or CNAPS. |
| Collect bank, identity, tax, and invoice data in one form | Reject | The approved initial route needs only payout information. |
| Automatic payout integration in the first product | Defer | The approved first boundary uses manual review and offline transfer. |

## Unknowns and Validation

- Finance owner: confirm the numeric global minimum amount. Product policy has
  otherwise fixed no withdrawal fee and no calendar frequency limit beyond one
  unfinished request.
- Operations owner: obtain the actual corporate-bank single or batch-payment
  template and confirm which branch, province, city, and CNAPS fields it accepts.
- Product and security owners: approve sensitive-information notice, separate
  consent, masking, authorized views, correction, and retention before design is
  approved for implementation.
