export type ConfirmedPurchaseArticle = {
  id: string;
  revision: number;
  status: "CONFIRMED";
  confirmedRevision: number;
  title: string;
  bodyMarkdown: string;
};
export interface ArticlePurchaseReader {
  confirmed(input: {
    accountId: string;
    brandId: string;
    articleId: string;
    revision: number;
  }): Promise<ConfirmedPurchaseArticle | null>;
}
