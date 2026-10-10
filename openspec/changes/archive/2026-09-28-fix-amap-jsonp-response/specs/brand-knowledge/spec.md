## MODIFIED Requirements

### Requirement: One verified Store Location

Brand Knowledge SHALL allow the existing authenticated Store Location search
through the server security proxy under the production `nosniff` policy.

#### Scenario: The Amap SDK requests JSONP search results

- **WHEN** the approved text-search path has one valid JavaScript callback
- **THEN** a matching JSONP envelope containing JSON returns JavaScript MIME
- **AND** ordinary JSON without a callback retains its upstream JSON MIME
- **AND** the server security code and existing proxy path boundary remain intact.

#### Scenario: An invalid callback or response cannot become executable

- **WHEN** a callback is invalid or duplicated
- **THEN** the proxy rejects the request before sending an upstream request
- **BUT WHEN** the upstream response does not match the requested callback or
  contains non-JSON content within that envelope
- **THEN** the proxy fails closed with a bounded unavailable response.
