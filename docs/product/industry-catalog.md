# GEOEval Industry Catalog

- Status: Approved
- Decision owner: Product owner
- Catalog: `industry-catalog@1.0.0`
- Approved on: 2026-08-26
- Decision history:
  [`standardize-industry-catalog`](../../openspec/changes/archive/2026-08-26-standardize-industry-catalog/proposal.md)

## Evolution marker

- State: `move-on-activation`
- Trigger: the first approved implementation change persists, serves, or uses
  the exact catalog as executable product data.
- Target: move the exact nodes and maintained metadata once into the stable
  owner-local executable or generated catalog source; leave this document as a
  generated reference or index-level product contract rather than a copied list.
- Reconciler: the lead agent for that activating implementation change.

This document is the sole current owner of GEOEval's exact two-level industry
catalog, category boundaries, stable identifiers, recommendation subjects, and
maintenance rules. Product forms, prompts, APIs, and seed mechanisms must refer
to this current owner rather than maintain copied category lists until the
evolution marker is executed.

## Purpose and responsibility

The catalog helps a non-expert business owner answer:

> 你最希望客户因为什么产品或服务找到并推荐你？

It is responsible for one coherent industry selection that helps GEOEval
generate a realistic industry-recommendation question. It is not responsible
for:

- listing the complete licensed business scope of an entity;
- determining a statistical principal activity or enterprise size;
- proving a license, credential, product registration, or regulatory status;
- replacing the flagship product-or-service information used for article
  generation; or
- exhaustively representing every economic activity.

## Selection contract

1. A brand selects exactly one primary and one dependent secondary category for
   the current evaluation-relevant profile state.
2. A mixed business selects the product or service that matters for the current
   consumer, procurement, or recommendation scenario, not every activity it can
   perform.
3. A listed category is chosen by expected recommendation context. Legal form,
   production method, sales channel, or a statistical code does not override
   that context.
4. Every primary contains one `Other` secondary. Selecting it requires a short,
   concrete product-or-service phrase; `Other` alone is not evaluation-ready.
5. Category selection guides questions only. Regulated-industry eligibility and
   user-agreement controls remain separately owned.

## Identifier and field contract

- Primary IDs are `IND-01` through `IND-13`.
- Secondary IDs append a two-digit suffix, for example `IND-01-01`.
- `99` is reserved for the `Other` secondary under each primary.
- Published IDs are immutable. They are never renumbered, reassigned, or reused
  for a different meaning.
- `Display name` is the Chinese label shown to customers.
- `Recommendation subject` is the controlled Chinese object supplied to
  question generation. It is not a complete question and must be combined with
  the current brand's region, concrete product or service, characteristics, and
  other relevant profile facts.
- Search aliases help customers find candidate categories. They are not stored
  as additional categories and never silently resolve an ambiguous match.

## Catalog

### IND-01 本地生活与门店服务

Use for nearby, appointment-based, or storefront services. Route regulated
healthcare to `IND-04`, accommodation and passenger travel to `IND-12`, consumer
product brands to `IND-02` or `IND-03`, and production suppliers to `IND-09`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-01-01 | 餐饮门店 | 餐厅或餐馆 |
| IND-01-02 | 饮品甜品 | 饮品店或甜品店 |
| IND-01-03 | 美容美发美甲 | 美容美发美甲门店 |
| IND-01-04 | 非医疗养生按摩 | 非医疗养生按摩门店 |
| IND-01-05 | 健身运动门店 | 健身运动场馆 |
| IND-01-06 | 宠物服务门店 | 宠物服务门店 |
| IND-01-07 | 汽车维修与养护 | 汽车维修养护门店 |
| IND-01-08 | 家政保洁 | 家政保洁服务商 |
| IND-01-09 | 洗衣洗护 | 洗衣洗护门店 |
| IND-01-10 | 摄影婚庆与礼仪 | 摄影婚庆礼仪服务商 |
| IND-01-11 | 亲子游乐与儿童服务 | 亲子游乐或儿童服务门店 |
| IND-01-12 | 维修回收与便民服务 | 维修回收或便民服务商 |
| IND-01-99 | 其他本地生活服务 | 客户填写的具体本地生活服务 |

### IND-02 消费品牌与零售

Use for physical products and retailers that customers discover through brand,
product, suitability, or purchase comparisons. Route finished electronics to
`IND-03`, professional health products to `IND-04`, and factories or contract
manufacturers to `IND-09`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-02-01 | 食品饮料品牌 | 食品或饮料品牌 |
| IND-02-02 | 美妆护肤与个护 | 美妆护肤或个护品牌 |
| IND-02-03 | 服装服饰 | 服装服饰品牌 |
| IND-02-04 | 鞋靴箱包 | 鞋靴箱包品牌 |
| IND-02-05 | 珠宝钟表与配饰 | 珠宝钟表或配饰品牌 |
| IND-02-06 | 家居日用与清洁用品 | 家居日用或清洁用品品牌 |
| IND-02-07 | 母婴用品与玩具 | 母婴用品或玩具品牌 |
| IND-02-08 | 文具图书与文创商品 | 文具图书或文创商品品牌 |
| IND-02-09 | 运动户外用品 | 运动户外用品品牌 |
| IND-02-10 | 家具与家居用品 | 家具或家居用品品牌 |
| IND-02-11 | 汽车、摩托车与出行装备 | 汽车、摩托车或出行装备品牌 |
| IND-02-12 | 礼品鲜花与园艺消费品 | 礼品鲜花或园艺消费品商家 |
| IND-02-13 | 综合零售与商超 | 综合零售商或商超 |
| IND-02-14 | 专业零售与电商店铺 | 专业零售商或电商店铺 |
| IND-02-15 | 眼镜与个人用品 | 眼镜或个人用品品牌 |
| IND-02-99 | 其他消费品牌与零售 | 客户填写的具体消费产品或零售服务 |

### IND-03 电子产品与智能设备

Use for finished electronic hardware and smart devices selected through product
or equipment recommendations. Route components and original-equipment
manufacturing to `IND-09`, software-only products to `IND-07`, and devices sought
primarily for professional medical or health outcomes to `IND-04`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-03-01 | 手机与配件 | 手机或手机配件品牌 |
| IND-03-02 | 电脑与办公硬件 | 电脑或办公硬件品牌 |
| IND-03-03 | 影音娱乐设备 | 影音娱乐设备品牌 |
| IND-03-04 | 数码影像 | 数码影像设备品牌 |
| IND-03-05 | 智能穿戴 | 智能穿戴设备品牌 |
| IND-03-06 | 智能家居设备 | 智能家居设备品牌 |
| IND-03-07 | 家电与厨房电器 | 家电或厨房电器品牌 |
| IND-03-08 | 网络与通信设备 | 网络或通信设备品牌 |
| IND-03-09 | 安防监控设备 | 安防监控设备品牌 |
| IND-03-10 | 车载电子与充电设备 | 车载电子或充电设备品牌 |
| IND-03-11 | 商用电子与收银设备 | 商用电子或收银设备品牌 |
| IND-03-12 | 机器人与无人机 | 机器人或无人机品牌 |
| IND-03-13 | 存储配件与数码周边 | 存储配件或数码周边品牌 |
| IND-03-99 | 其他电子产品与智能设备 | 客户填写的具体电子产品或智能设备 |

### IND-04 医疗健康与康养

Use when the recommendation concerns diagnosis, treatment, health improvement,
rehabilitation, care, or a professional health product. Route ordinary beauty,
massage, and fitness storefronts to `IND-01`, ordinary food to `IND-02`, and
contract production to `IND-09`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-04-01 | 综合医院与门诊 | 综合医院或门诊机构 |
| IND-04-02 | 专科医疗 | 专科医疗机构 |
| IND-04-03 | 口腔医疗 | 口腔医疗机构 |
| IND-04-04 | 中医医疗 | 中医医疗机构 |
| IND-04-05 | 医疗美容 | 医疗美容机构 |
| IND-04-06 | 体检与健康管理 | 体检或健康管理机构 |
| IND-04-07 | 康复理疗 | 康复理疗机构 |
| IND-04-08 | 心理咨询与心理服务 | 心理咨询或心理服务机构 |
| IND-04-09 | 养老与护理 | 养老或护理机构 |
| IND-04-10 | 药品与医药服务 | 药品品牌或医药服务商 |
| IND-04-11 | 医疗器械与诊断设备 | 医疗器械或诊断设备品牌 |
| IND-04-12 | 营养健康与保健食品 | 营养健康或保健食品品牌 |
| IND-04-13 | 母婴健康与生育服务 | 母婴健康或生育服务机构 |
| IND-04-14 | 智能健康与可穿戴医疗设备 | 智能健康或可穿戴医疗设备品牌 |
| IND-04-99 | 其他医疗健康与康养 | 客户填写的具体医疗健康或康养服务 |

### IND-05 教育培训与知识服务

Use when the customer is recommending learning, instruction, coaching, or
knowledge acquisition. Route professional advice and execution to `IND-06`,
software tools to `IND-07`, and general media content to `IND-11`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-05-01 | 婴幼儿早教 | 婴幼儿早教机构 |
| IND-05-02 | 中小学教育服务 | 中小学教育服务机构 |
| IND-05-03 | 语言培训 | 语言培训机构 |
| IND-05-04 | 职业技能培训 | 职业技能培训机构 |
| IND-05-05 | 企业培训 | 企业培训服务商 |
| IND-05-06 | IT与数字技能培训 | IT或数字技能培训机构 |
| IND-05-07 | 艺术兴趣培训 | 艺术兴趣培训机构 |
| IND-05-08 | 体育培训 | 体育培训机构 |
| IND-05-09 | 留学与国际教育服务 | 留学或国际教育服务机构 |
| IND-05-10 | 考试考证辅导 | 考试考证辅导机构 |
| IND-05-11 | 高等与继续教育 | 高等或继续教育机构 |
| IND-05-12 | 知识付费与在线课程 | 知识付费平台或在线课程 |
| IND-05-13 | 教育咨询与升学规划 | 教育咨询或升学规划机构 |
| IND-05-14 | 专业知识培训 | 专业知识培训机构 |
| IND-05-99 | 其他教育培训与知识服务 | 客户填写的具体教育培训或知识服务 |

### IND-06 企业服务与专业服务

Use when an organizational customer buys expertise, advice, agency work, or
outsourced execution. Route software products to `IND-07`, media outputs to
`IND-11`, and industrial equipment or production services to `IND-09`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-06-01 | 法律服务 | 律师事务所或法律服务机构 |
| IND-06-02 | 财税与审计 | 财税或审计服务机构 |
| IND-06-03 | 工商注册与企业合规 | 工商注册或企业合规服务机构 |
| IND-06-04 | 管理与战略咨询 | 管理或战略咨询机构 |
| IND-06-05 | 人力资源与招聘 | 人力资源或招聘服务机构 |
| IND-06-06 | 市场调研与商业数据服务 | 市场调研或商业数据服务商 |
| IND-06-07 | 营销策划与广告代理 | 营销策划或广告代理公司 |
| IND-06-08 | 品牌设计与公关服务 | 品牌设计或公关服务公司 |
| IND-06-09 | 会展活动与商务服务 | 会展活动或商务服务公司 |
| IND-06-10 | 办公与行政外包 | 办公或行政外包服务商 |
| IND-06-11 | 检验检测与认证 | 检验检测或认证机构 |
| IND-06-12 | 知识产权服务 | 知识产权服务机构 |
| IND-06-13 | 翻译与语言服务 | 翻译或语言服务机构 |
| IND-06-14 | 安保保洁与设施管理 | 企业安保保洁或设施管理服务商 |
| IND-06-15 | 办公场地与设备租赁 | 办公场地或设备租赁服务商 |
| IND-06-99 | 其他企业服务与专业服务 | 客户填写的具体企业或专业服务 |

### IND-07 软件与数字服务

Use when software, a platform, cloud capacity, data, or technical delivery is the
core product. Route finished hardware to `IND-03`, agency execution to `IND-06`,
and media content to `IND-11`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-07-01 | 企业管理软件 | 企业管理软件 |
| IND-07-02 | 行业业务软件 | 行业业务软件 |
| IND-07-03 | 网站、电商与小程序服务 | 网站、电商或小程序服务商 |
| IND-07-04 | 云计算与数据中心 | 云计算或数据中心服务商 |
| IND-07-05 | 网络安全与运维 | 网络安全或运维服务商 |
| IND-07-06 | 数据分析与商业智能 | 数据分析或商业智能产品 |
| IND-07-07 | 人工智能产品与服务 | 人工智能产品或服务 |
| IND-07-08 | 开发工具与技术平台 | 开发工具或技术平台 |
| IND-07-09 | 通信与协作软件 | 通信或协作软件 |
| IND-07-10 | 营销与客户运营软件 | 营销或客户运营软件 |
| IND-07-11 | 法律、财税与人力资源软件 | 法律、财税或人力资源软件 |
| IND-07-12 | 消费互联网应用与平台 | 消费互联网应用或平台 |
| IND-07-13 | 游戏与互动软件 | 游戏或互动软件 |
| IND-07-14 | 工业软件与物联网平台 | 工业软件或物联网平台 |
| IND-07-15 | 软件定制与技术外包 | 软件定制或技术外包服务商 |
| IND-07-99 | 其他软件与数字服务 | 客户填写的具体软件或数字服务 |

### IND-08 地产、装修与工程建设

Use for property development and use, property transactions, design,
renovation, construction, and engineering delivery. Route furniture brands to
`IND-02` and furniture or material contract manufacturing to `IND-09`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-08-01 | 住宅地产开发 | 住宅地产项目或开发商 |
| IND-08-02 | 商业地产与产业园区 | 商业地产项目或产业园区 |
| IND-08-03 | 房产经纪与交易服务 | 房产经纪或交易服务机构 |
| IND-08-04 | 物业管理与社区服务 | 物业管理或社区服务商 |
| IND-08-05 | 房屋租赁与长租服务 | 房屋租赁或长租服务商 |
| IND-08-06 | 室内设计与装修 | 室内设计或装修公司 |
| IND-08-07 | 全屋定制与家装服务 | 全屋定制或家装服务商 |
| IND-08-08 | 建筑设计与工程咨询 | 建筑设计或工程咨询机构 |
| IND-08-09 | 房屋建筑工程 | 房屋建筑工程公司 |
| IND-08-10 | 市政与基础设施工程 | 市政或基础设施工程公司 |
| IND-08-11 | 园林景观工程 | 园林景观工程公司 |
| IND-08-12 | 建材与装饰材料 | 建材或装饰材料品牌 |
| IND-08-13 | 智能建筑与弱电工程 | 智能建筑或弱电工程公司 |
| IND-08-14 | 工程维修与改造 | 工程维修或改造公司 |
| IND-08-15 | 工程监理与项目管理 | 工程监理或项目管理机构 |
| IND-08-99 | 其他地产装修与工程建设 | 客户填写的具体地产、装修或工程服务 |

### IND-09 工业制造与供应链

Use for production, processing, contract manufacturing, industrial procurement,
freight, and industrial supply. A finished consumer brand selects its market
category instead; passenger transport selects `IND-12`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-09-01 | 机械设备与工业装备 | 机械设备或工业装备供应商 |
| IND-09-02 | 汽车零部件与交通装备制造 | 汽车零部件或交通装备制造商 |
| IND-09-03 | 电子元器件与半导体 | 电子元器件或半导体供应商 |
| IND-09-04 | 电气设备与新能源装备 | 电气设备或新能源装备供应商 |
| IND-09-05 | 仪器仪表与工业自动化 | 仪器仪表或工业自动化供应商 |
| IND-09-06 | 金属材料与金属制品 | 金属材料或金属制品供应商 |
| IND-09-07 | 化工材料与化工制品 | 化工材料或化工制品供应商 |
| IND-09-08 | 塑料橡胶与包装材料 | 塑料橡胶或包装材料供应商 |
| IND-09-09 | 纺织服装制造 | 纺织服装制造商 |
| IND-09-10 | 食品饮料生产与代工 | 食品饮料生产或代工企业 |
| IND-09-11 | 日化美妆生产与代工 | 日化美妆生产或代工企业 |
| IND-09-12 | 医药原料与医疗器械制造 | 医药原料或医疗器械制造商 |
| IND-09-13 | 家具与家居用品制造 | 家具或家居用品制造商 |
| IND-09-14 | 印刷包装与加工服务 | 印刷包装或加工服务商 |
| IND-09-15 | 能源、矿产、公用事业与环保 | 能源矿产、公用事业或环保服务商 |
| IND-09-16 | 仓储物流与货运 | 仓储物流或货运服务商 |
| IND-09-17 | 供应链管理与产业贸易 | 供应链管理或产业贸易服务商 |
| IND-09-18 | 工业维修与技术服务 | 工业维修或技术服务商 |
| IND-09-99 | 其他工业制造与供应链 | 客户填写的具体工业产品或供应链服务 |

### IND-10 农业与农产品

Use for primary agriculture, agricultural inputs and support, origin supply, and
primary processing. Route packaged consumer brands to `IND-02`, factory-scale
processing to `IND-09`, and tourism-led rural experiences to `IND-12`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-10-01 | 粮食与经济作物种植 | 粮食或经济作物生产者 |
| IND-10-02 | 果蔬与园艺种植 | 果蔬或园艺产品生产者 |
| IND-10-03 | 茶叶咖啡与特色作物 | 茶叶、咖啡或特色作物生产者 |
| IND-10-04 | 畜牧养殖 | 畜牧养殖企业 |
| IND-10-05 | 水产养殖与渔业 | 水产养殖或渔业企业 |
| IND-10-06 | 林业竹木与林下产品 | 林业竹木或林下产品供应商 |
| IND-10-07 | 种子种苗与育种 | 种子种苗或育种企业 |
| IND-10-08 | 饲料肥料与农业投入品 | 饲料肥料或农业投入品供应商 |
| IND-10-09 | 农机农具与农业设施 | 农机农具或农业设施供应商 |
| IND-10-10 | 农业技术与社会化服务 | 农业技术或社会化服务商 |
| IND-10-11 | 初级农产品加工与产地供应 | 初级农产品加工或产地供应商 |
| IND-10-12 | 农产品批发与产销对接 | 农产品批发或产销服务商 |
| IND-10-99 | 其他农业与农产品 | 客户填写的具体农业产品或服务 |

### IND-11 文化传媒与内容创意

Use when the core output is content, media, intellectual property, performance,
sport, or a creative work. Route marketing agency execution to `IND-06`,
marketing software to `IND-07`, and ordinary local photography or wedding
services to `IND-01`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-11-01 | 新闻资讯与媒体 | 新闻资讯或媒体品牌 |
| IND-11-02 | 出版与数字阅读 | 出版或数字阅读品牌 |
| IND-11-03 | 影视制作与发行 | 影视制作或发行公司 |
| IND-11-04 | 短视频与内容机构 | 短视频或内容机构 |
| IND-11-05 | 音乐与音频内容 | 音乐或音频内容机构 |
| IND-11-06 | 广播电视与直播 | 广播电视或直播机构 |
| IND-11-07 | 动漫与IP内容 | 动漫或IP内容机构 |
| IND-11-08 | 游戏内容与电竞 | 游戏内容或电竞机构 |
| IND-11-09 | 广告内容制作 | 广告内容制作公司 |
| IND-11-10 | 设计与创意工作室 | 设计或创意工作室 |
| IND-11-11 | 艺术展览与演出 | 艺术展览或演出机构 |
| IND-11-12 | 文博场馆与文化服务 | 文博场馆或文化服务机构 |
| IND-11-13 | 体育赛事与运营 | 体育赛事或运营机构 |
| IND-11-14 | 创作者与MCN机构 | 创作者或MCN机构 |
| IND-11-15 | 商业摄影与视觉内容 | 商业摄影或视觉内容机构 |
| IND-11-99 | 其他文化传媒与内容创意 | 客户填写的具体文化传媒或内容服务 |

### IND-12 旅游住宿与交通出行

Use for destinations, stays, visitor experiences, and passenger movement. Route
standalone restaurants to `IND-01`, freight to `IND-09`, and vehicle brands to
`IND-02`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-12-01 | 酒店 | 酒店 |
| IND-12-02 | 民宿与度假住宿 | 民宿或度假住宿 |
| IND-12-03 | 旅行社与定制旅行 | 旅行社或定制旅行服务商 |
| IND-12-04 | 景区与主题乐园 | 景区或主题乐园 |
| IND-12-05 | 度假区与露营地 | 度假区或露营地 |
| IND-12-06 | 文旅体验与研学旅行 | 文旅体验或研学旅行服务商 |
| IND-12-07 | 票务与旅游平台 | 票务或旅游平台 |
| IND-12-08 | 旅游交通与包车 | 旅游交通或包车服务商 |
| IND-12-09 | 出租车与网约车 | 出租车或网约车服务商 |
| IND-12-10 | 公路铁路水路客运 | 公路、铁路或水路客运服务商 |
| IND-12-11 | 航空与机场服务 | 航空或机场服务商 |
| IND-12-12 | 汽车租赁与共享出行 | 汽车租赁或共享出行服务商 |
| IND-12-13 | 导游与目的地服务 | 导游或目的地服务商 |
| IND-12-14 | 签证与旅行配套服务 | 签证或旅行配套服务商 |
| IND-12-99 | 其他旅游住宿与交通出行 | 客户填写的具体旅游、住宿或客运服务 |

### IND-13 金融与保险服务

Use when the core delivery is money, credit, payment, investment, or risk
protection. Route accounting and audit to `IND-06`, and software sold to
financial institutions to `IND-07`.

| ID | Display name | Recommendation subject |
| --- | --- | --- |
| IND-13-01 | 银行与信贷 | 银行或信贷服务机构 |
| IND-13-02 | 支付与收单服务 | 支付或收单服务商 |
| IND-13-03 | 证券与基金服务 | 证券或基金服务机构 |
| IND-13-04 | 资产管理与财富管理 | 资产管理或财富管理机构 |
| IND-13-05 | 保险产品与保险服务 | 保险产品或保险服务机构 |
| IND-13-06 | 保险经纪与代理 | 保险经纪或代理机构 |
| IND-13-07 | 融资租赁与商业保理 | 融资租赁或商业保理机构 |
| IND-13-08 | 担保与小额贷款 | 担保或小额贷款机构 |
| IND-13-09 | 企业融资与投融资顾问 | 企业融资或投融资顾问机构 |
| IND-13-10 | 消费金融与分期 | 消费金融或分期服务商 |
| IND-13-11 | 金融科技与互联网金融服务 | 金融科技或互联网金融服务商 |
| IND-13-12 | 财务规划与理财咨询 | 财务规划或理财咨询机构 |
| IND-13-13 | 征信与风险管理服务 | 征信或风险管理服务机构 |
| IND-13-14 | 金融基础设施与清算服务 | 金融基础设施或清算服务机构 |
| IND-13-99 | 其他金融与保险服务 | 客户填写的具体金融或保险服务 |

## Mixed-business routing examples

| Business | Selection by intended recommendation context |
| --- | --- |
| Cosmetics brand / beauty salon / cosmetics factory | `IND-02-02` / `IND-01-03` / `IND-09-11` |
| Consumer-electronics brand / component factory / software company | `IND-03` child / `IND-09-03` / `IND-07` child |
| Restaurant / packaged-food brand / food manufacturer | `IND-01-01` / `IND-02-01` / `IND-09-10` |
| Law firm / legal software / legal training | `IND-06-01` / `IND-07-11` / `IND-05-14` |
| Marketing agency / media-content company / marketing platform | `IND-06-07` / `IND-11` child / `IND-07-10` |
| Furniture brand / renovation company / furniture factory | `IND-02-10` / `IND-08-06` / `IND-09-13` |
| Medical device / health food / smart-health device | `IND-04-11` / `IND-04-12` / `IND-04-14` when the recommendation is health-led; finished consumer-device comparison may use `IND-03` |
| Automobile brand / repair storefront / parts factory | `IND-02-11` / `IND-01-07` / `IND-09-02` |
| Hotel or homestay / scenic site / standalone restaurant | `IND-12-01` or `02` / `IND-12-04` / `IND-01-01` |
| Freight logistics / passenger transport | `IND-09-16` / the matching `IND-12` child |

## Initial alias guidance

Aliases are maintained only when they help a customer find an existing semantic
node. Examples include:

| Search alias | Candidate category |
| --- | --- |
| 美业、皮肤管理 | `IND-01-03` |
| 汽修、汽车保养、爱车 | `IND-01-07` |
| SaaS、ERP、CRM | Search the relevant `IND-07` candidates; do not auto-select one |
| OEM、ODM、贴牌、代工 | Search matching manufacturing nodes under `IND-09` |
| 货代、三方物流、3PL | `IND-09-16` |
| 律所、律师团队 | `IND-06-01` |
| 医美 | `IND-04-05` when the service is medical; ordinary beauty remains `IND-01-03` |
| 民宿、客栈 | `IND-12-02` |

## Versioning and maintenance

- **Patch:** change wording, aliases, examples, or order without changing a
  category boundary.
- **Minor:** add a category, deprecate a category, change availability, or add a
  crosswalk while preserving existing identifier meaning.
- **Major:** change a semantic boundary in a way that could reinterpret a saved
  selection. Existing IDs remain immutable and a separately approved migration
  and history plan is required.

Catalog maintenance alone does not create a new evaluation-input revision,
question set, or free-evaluation opportunity for an unchanged brand profile.
Existing saved selections are never silently moved to another category. If a
future semantic change requires a different selection, a separately approved
change must either preserve the earlier semantics for that saved selection or
ask the customer to confirm a new selection; the confirmed profile change then
follows the ordinary evaluation-input revision rule.

Before accepting any catalog change, name the observed coverage or ambiguity
failure, the category or question behavior it can reach, and the action that the
change will alter. Useful refresh signals include repeated equivalent `Other`
phrases, repeated correction between the same categories, an approved new target
customer group, or unnatural generated industry questions.

An official evaluation snapshot retains the selected primary and secondary IDs,
their display names, the catalog version, the `Other` phrase when present, and
the recommendation subject actually used. Later maintenance never changes the
meaning of historical evidence.

## External-classification relationship

GB/T 4754, ISIC, NAICS, and NACE are activity-classification coverage checks;
CPC and GB/T 36431 are product-classification coverage checks. Crosswalks are
informational and may be many-to-many. They are not customer-facing nodes and
their codes are not GEOEval identifiers. The decision evidence and refresh
boundary are recorded in the archived
[source brief](../../openspec/changes/archive/2026-08-26-standardize-industry-catalog/research/industry-classification-source-brief.md).
