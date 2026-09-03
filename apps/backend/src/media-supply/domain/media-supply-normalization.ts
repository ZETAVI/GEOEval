export function normalizeMediaName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}
