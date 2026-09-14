import type { BrandView } from "../domain/brand.types.js";

export function presentBrand(brand: BrandView) {
  return {
    id: brand.id,
    status: brand.status,
    companyName: brand.companyName,
    primaryIndustryId: brand.primaryIndustryId,
    secondaryIndustryId: brand.secondaryIndustryId,
    otherProductOrService: brand.otherProductOrService,
    flagshipProductOrService: brand.flagshipProductOrService,
    characteristics: brand.characteristics,
    articleInformation: brand.articleInformation,
    revision: brand.revision,
    contactName: brand.contactName,
    contactMobile: brand.contactMobile,
    primaryIndustryLabel: brand.primaryIndustryLabel,
    secondaryIndustryLabel: brand.secondaryIndustryLabel,
    storeLocation: brand.storeLocation
      ? {
          placeName: brand.storeLocation.placeName,
          formattedAddress: brand.storeLocation.formattedAddress,
          coordinate: brand.storeLocation.coordinate,
          officialRegion: brand.storeLocation.officialRegion,
          queryLocality: brand.storeLocation.queryLocality,
          verifiedAt: brand.storeLocation.verifiedAt,
        }
      : null,
    readyForEvaluation: brand.readyForEvaluation,
    missingFields: brand.missingFields,
    readyForArticleGeneration: brand.readyForArticleGeneration,
    articleInformationMissingFields: brand.articleInformationMissingFields,
    isCurrent: brand.isCurrent,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}
