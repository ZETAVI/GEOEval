export class GeoOptimizationNotFoundError extends Error {
  constructor(message = "未找到 GEO 优化内容") {
    super(message);
    this.name = "GeoOptimizationNotFoundError";
  }
}

export class CurrentBrandRequiredError extends Error {
  constructor() {
    super("请先切换到需要优化的当前品牌");
    this.name = "CurrentBrandRequiredError";
  }
}

export class BrandRevisionConflictError extends Error {
  constructor() {
    super("品牌资料已被更新，请刷新后重试");
    this.name = "BrandRevisionConflictError";
  }
}

export class EvaluationGuidanceRequiredError extends Error {
  constructor() {
    super("请先完成一次有效评测");
    this.name = "EvaluationGuidanceRequiredError";
  }
}

export class ActiveArticleGenerationError extends Error {
  constructor() {
    super("该品牌已有文章正在生成");
    this.name = "ActiveArticleGenerationError";
  }
}

export class ArticleReplacementRequiredError extends Error {
  constructor() {
    super("重新生成会替换当前文章，请确认当前文章版本");
    this.name = "ArticleReplacementRequiredError";
  }
}

export class ArticleRevisionConflictError extends Error {
  constructor() {
    super("文章已被更新，请刷新后重试");
    this.name = "ArticleRevisionConflictError";
  }
}

export class ArticleGenerationNotRetryableError extends Error {
  constructor() {
    super("当前生成状态不能重试");
    this.name = "ArticleGenerationNotRetryableError";
  }
}

export class GeoOptimizationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoOptimizationValidationError";
  }
}
