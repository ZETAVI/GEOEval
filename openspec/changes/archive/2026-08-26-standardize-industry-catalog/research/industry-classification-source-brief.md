# Source Brief: GEOEval Industry Classification Coverage

- Decision date: 2026-08-26
- Access date: 2026-08-26
- Evidence class: official standards and official classification guidance

## Recommendation

Use official activity and product classifications to check coverage and
boundaries, but maintain an independent GEOEval catalog organized around the
product or service for which a brand wants to be found and recommended.

## Decision constraints

- The catalog must serve non-expert small and medium business owners across
  local services, consumer products, professional services, software,
  manufacturing, and other major commercial domains.
- The catalog must form coherent industry-recommendation questions without
  asking the customer for a statistical or legal classification.
- External classifications must not become runtime dependencies or GEOEval
  stable identifiers.
- Public local-life platforms can supply familiar Chinese vocabulary only; no
  complete or current merchant-onboarding catalog is claimed.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| GB/T 4754 classifies economic activities and assigns a unit by its principal activity; the current standard has four levels and a revision plan is in progress | [National standard record](https://std.samr.gov.cn/gb/search/gbDetailed?id=sM1m4dreNE8%3D&mode=p) and [National Bureau of Statistics guidance](https://www.stats.gov.cn/hd/cjwtjd/202302/t20230207_1902279.html) | GB/T 4754-2017; accessed 2026-08-26 | Use for coverage and coarse crosswalks, not UI categories |
| The Chinese enterprise-size method classifies legal entities or units by industry and measures including employment, revenue, and assets | [National Bureau of Statistics](https://www.stats.gov.cn/sj/tjbz/gjtjbz/202302/t20230213_1902763.html) | 2017 method; accessed 2026-08-26 | It does not provide customer-facing industry semantics |
| GB/T 36431 is a consumer-product classification, remains current, and has a revision project | [National standard record](https://std.samr.gov.cn/gb/search/gbDetailed?id=f3VgqVw7lXM%3D&mode=p) | GB/T 36431-2018; accessed 2026-08-26 | Useful for part of physical consumer-product coverage, not services or the complete GEOEval market |
| ISIC is an international economic-activity classification; Revision 5 was endorsed in 2023 and its publication remains forthcoming | [UN Statistics Division](https://unstats.un.org/unsd/classifications/Econ/isic) | ISIC Rev.5; accessed 2026-08-26 | Confirms broad activity coverage and current software/content distinctions |
| CPC classifies products, including goods and services; Version 3.0 material is available while publication remains forthcoming | [UN Statistics Division](https://unstats.un.org/unsd/classifications/Econ/CPC) | CPC Ver.3.0; accessed 2026-08-26 | Complements activity classifications but remains too detailed for the UI |
| NAICS classifies establishments using a production-oriented concept and has 20 sectors | [US Census Bureau](https://www.census.gov/programs-surveys/economic-census/year/2022/guidance/understanding-naics.html) | NAICS 2022; page revised 2025-11-14; accessed 2026-08-26 | Checks professional, information, administration, and other business coverage |
| NACE Rev.2.1 is the EU activity classification used for European statistics from 2025 and separates content from software and information services at the highest level | [Eurostat](https://ec.europa.eu/eurostat/web/nace) | NACE Rev.2.1; accessed 2026-08-26 | Supports distinct content/media and software/digital primary categories |
| Public local-life materials expose familiar terms such as food, beauty, parent-child, fitness, life services, health, automobile care, and pets | [Dianping public Guangzhou page](https://www.dianping.com/guangzhou/) and [Meituan public technical article](https://tech.meituan.com/2021/07/15/Construction-and-Application-of-Lifestyle-General-Needs-Net.html) | Public pages; accessed 2026-08-26 | Vocabulary evidence only; do not copy or claim a complete platform catalog |

## Coarse coverage crosswalk

This table is an evidence aid, not a one-to-one translation. One GEOEval primary
category can cross several activity-standard sections because GEOEval classifies
recommendation intent rather than the statistical unit.

| GEOEval primary | GB/T 4754-2017 | ISIC Rev.5 / NACE Rev.2.1 | NAICS 2022 |
| --- | --- | --- | --- |
| `IND-01` Local life and storefront services | H accommodation and food; O resident services; R culture, sports and entertainment | I, S, T | 72, 71, 81 |
| `IND-02` Consumer brands and retail | C manufacturing; F wholesale and retail | C, G | 31-33, 44-45 |
| `IND-03` Electronics and smart devices | C manufacturing; F wholesale and retail; part of I information services | C, G, part of K | 31-33, 44-45, part of 51 |
| `IND-04` Medical, health and care | Q health and social work; C manufacturing; F retail | R, C, G | 62, 31-33, 44-45 |
| `IND-05` Education, training and knowledge services | P education; parts of I and L | Q, parts of K and N | 61, parts of 51 and 54 |
| `IND-06` Business and professional services | L leasing and business services; M scientific and technical services | N, O | 54, 55, 56 |
| `IND-07` Software and digital services | I information transmission, software and IT services | K | 51, part of 54 |
| `IND-08` Real estate, renovation and construction | E construction; K real estate; parts of L and M | F, M, N | 23, 53, 54 |
| `IND-09` Industrial manufacturing and supply chain | B, C, D, F, G, N and related M activities | B, C, D, E, G, H | 21, 22, 31-33, 42, 48-49, 56 |
| `IND-10` Agriculture and agricultural products | A; parts of C and F | A, C, G | 11, 31-33, 42 |
| `IND-11` Culture, media and creative content | I information; L business services; R culture, sports and entertainment | J, N, S | 51, 54, 71 |
| `IND-12` Tourism, accommodation and passenger travel | G transport; H accommodation and food; R tourism-related activities | H, I, S | 48-49, 72, 71 |
| `IND-13` Financial and insurance services | J finance | L | 52 |

CPC supplies a cross-cutting product view: its current Version 3.0 material
keeps sections 0-4 mainly for transportable goods and 5-9 mainly for services and
other products. GB/T 36431 is useful only for part of the physical consumer-
product surface. Neither product classification replaces the recommendation-
intent catalog.

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| GEOEval-owned recommendation-intent catalog | Adopt | Matches the customer decision and controlled question-generation boundary |
| Direct activity-standard UI | Reject | Wrong classification object and excessive detail |
| Direct product-standard UI | Reject | Incomplete service coverage and excessive detail |
| Local-life-platform copy | Reject | Narrow coverage, unstable ownership, and unavailable complete current taxonomy |

## Unknowns and validation

- Actual category findability and ambiguity remain unobserved until the selector
  and first question-generation slice are implemented. The smallest future
  validation is a focused usability and generated-question set covering the
  maintained boundary examples.
- Regulated-industry notice and agreement wording is intentionally unresearched
  here because the product owner deferred it to a separate task.

## Reuse and refresh boundary

- Reusable while the cited standard versions/statuses and the decision to use
  them only for coverage remain unchanged.
- Refresh when a cited revision is formally published, a category boundary
  depends on a changed standard, a new target customer group is approved, or
  repeated real `Other` and correction behavior shows a coverage failure.
