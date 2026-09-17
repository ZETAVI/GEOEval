# 支付方式品牌标识 Source Brief

Checked: 2026-09-17. Decision owner: Issue #109.

## Primary sources

- [微信支付物料管理规范](https://pay.wechatpay.cn/static/material/material_rules.shtml): 支持微信支付的相关界面应完整展示官方标识；多支付品牌应保持同等尺寸、位置与视觉权重，不得拆分、变形或弱化。
- [微信支付品牌基础物料](https://pay.wechatpay.cn/static/material/brand.shtml): 官方物料包包含微信支付 Logo 源文件；页面直接链接 `brand.zip`。
- [微信支付 SDK 官方动态图标下载](https://pay.wechatpay.cn/wiki/doc/wxfacepay/develop/sdk-logo.html): 官方品牌 Logo 的下载目标为 `https://wx.gtimg.com/outwxgtimg/imgs/logo/wxpaylogo_xxxhdpi.png`，下载文件 SHA-256 为 `048345295da3308ed1d61860c611fbaa74762bdffec6412af6f3c78d023e7d99`。
- [支付宝开放平台](https://open.alipay.com/): 官方页面提供支付宝图形 favicon `https://mdn.alipayobjects.com/huamei_llciku/afts/img/A*ofPZSqIRTxYAAAAAAAAAAAAADsTiAQ/original`，下载文件 SHA-256 为 `086c7b8514799cf3531777bf67873d741bd8bf924c55d568bc091d098375d9f8`。
- [Alipay Brand Use Standards](https://global-pre.alipay.com/help-notices/6): 合作方使用支付宝标识应遵循官方数字物料和合作授权，不自行改造为近似标识。

## Decision

开发与受控验收使用上述官方文件的原始像素，不描摹、不改色、不拉伸；文字“支付宝 / 微信支付”保持可见，替代文本保留。两种支付方式卡片使用同等容器高度与视觉权重，而不是强制两个原始文件有相同宽高。

生产发布前重新核对商户合同和当时有效的品牌规范；若授权不覆盖本地化缓存，改为官方托管资源或经商户后台取得的最新版物料，不阻塞本次产品/工程闭环。
