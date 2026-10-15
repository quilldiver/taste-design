/**
 * 「作品」二级页的内容索引 —— 由《网站的结构，以及素材的编号》整理而来。
 *
 * - 一级 = SECTIONS（Logo / Activity / Brand / Packaging / Typsetting / IP / Other）
 * - 二级 = SECTIONS[].groups（可空：该一级没有二级时只有一项 null，前端不渲染二级列）
 * - 三级 = WORKS（每个作品 = 详情页里按页码顺序排下来的若干张图）
 *
 * ⚠ WORKS 的顺序就是右侧图片流自上而下的顺序（按原作品集的页码升序），
 *   因此「滚到底自然接下一个作品」不需要额外排序逻辑。
 * 素材在 public/works/ 下，文件名 = 原封面上的页码（P15 → 015.webp）。
 */

export type WorkImage = { file: string; w: number; h: number };

export type Work = {
  id: string;
  /** SECTIONS 下标 */
  sec: number;
  /** 该一级的 groups 下标 */
  grp: number;
  title: string;
  /** 原作品集页码，如 P15-P18 */
  pages: string;
  imgs: WorkImage[];
};

export type Section = {
  slug: string;
  en: string;
  cn: string;
  /** 二级名；null = 该一级不分二级 */
  groups: (string | null)[];
  /** 该一级作品在 WORKS 里的下标，按页码升序 */
  works: number[];
};

export const SECTIONS: Section[] = [
  {
    slug: "logo", en: "Logo", cn: "标志设计",
    groups: [null],
    works: [0],
  },
  {
    slug: "event", en: "Activity", cn: "活动设计",
    groups: ["视觉设计", "市集活动", "品牌活动", "城市品牌活动"],
    works: [1, 2, 3, 4, 6, 8, 9, 5, 7],
  },
  {
    slug: "brand", en: "Brand", cn: "品牌设计",
    groups: ["潮玩", "餐饮", "商业", "城市", "宠物", "科技", "工业", "首饰"],
    works: [10, 11, 12, 13, 15, 16, 20, 21, 22, 14, 19, 17, 18, 26, 23, 24, 25],
  },
  {
    slug: "pack", en: "Packaging", cn: "包装设计",
    groups: ["宠物", "餐饮", "护肤", "保健"],
    works: [27, 28, 29, 30, 31, 32, 33, 35, 36, 37, 34, 38],
  },
  {
    slug: "type", en: "Typsetting", cn: "排版设计",
    groups: [null],
    works: [39],
  },
  {
    slug: "ip", en: "IP", cn: "IP设计",
    groups: [null],
    works: [40, 41, 42, 43],
  },
  {
    slug: "misc", en: "Other", cn: "其他设计",
    groups: ["文化空间打造", "展厅设计", "视觉设计", "详情页/公众号"],
    works: [44, 45, 46, 47, 48, 49, 50, 51],
  },
];

export const WORKS: Work[] = [
  { id: "w00", sec: 0, grp: 0, title: "Logo设计", pages: "P4-P5",
    imgs: [{ file: "004.webp", w: 3700, h: 1600 }, { file: "005.webp", w: 3700, h: 1600 }] },
  { id: "w01", sec: 1, grp: 0, title: "天马行空 云瞰中国年", pages: "P7-P9",
    imgs: [{ file: "007.webp", w: 3177, h: 1787 }, { file: "008.webp", w: 4001, h: 1643 }, { file: "009.webp", w: 3697, h: 1735 }] },
  { id: "w02", sec: 1, grp: 1, title: "爱谁谁 放肆节", pages: "P10-P12",
    imgs: [{ file: "010.webp", w: 3227, h: 984 }, { file: "011.webp", w: 2980, h: 1994 }, { file: "012.webp", w: 4001, h: 2251 }] },
  { id: "w03", sec: 1, grp: 2, title: "卡萨帝金杯咖啡 城市奇遇计划", pages: "P13-P14",
    imgs: [{ file: "013.webp", w: 3214, h: 1360 }, { file: "014.webp", w: 4001, h: 2251 }] },
  { id: "w04", sec: 1, grp: 2, title: "海尔洗衣机 穿行四季冰雪季", pages: "P15-P18",
    imgs: [{ file: "015.webp", w: 2943, h: 1654 }, { file: "016.webp", w: 4001, h: 2251 }, { file: "017.webp", w: 4001, h: 2251 }, { file: "018.webp", w: 4001, h: 2251 }] },
  { id: "w05", sec: 1, grp: 3, title: "青岛首届 宠物嘉年华", pages: "P19-P20",
    imgs: [{ file: "019.webp", w: 3225, h: 2251 }, { file: "020.webp", w: 4001, h: 2251 }] },
  { id: "w06", sec: 1, grp: 2, title: "青岛精酿生活节 宠爱有好时光", pages: "P21-P22",
    imgs: [{ file: "021.webp", w: 3224, h: 2251 }, { file: "022.webp", w: 4001, h: 2251 }] },
  { id: "w07", sec: 1, grp: 3, title: "市南区 “文明养犬” 主题实践活动", pages: "P23-P24",
    imgs: [{ file: "023.webp", w: 3224, h: 2251 }, { file: "024.webp", w: 4001, h: 2251 }] },
  { id: "w08", sec: 1, grp: 2, title: "2024海尔全球创客音乐节", pages: "P25-P26",
    imgs: [{ file: "025.webp", w: 3224, h: 2251 }, { file: "026.webp", w: 4001, h: 2251 }] },
  { id: "w09", sec: 1, grp: 2, title: "2024年青岛海誓山盟婚尚博览会", pages: "P27-P28",
    imgs: [{ file: "027.webp", w: 3100, h: 1550 }, { file: "028.webp", w: 4001, h: 2251 }] },
  { id: "w10", sec: 2, grp: 0, title: "夹兀 快乐制造机", pages: "P30-P32",
    imgs: [{ file: "030.webp", w: 4001, h: 2251 }, { file: "031.webp", w: 4001, h: 2251 }, { file: "032.webp", w: 4001, h: 2251 }] },
  { id: "w11", sec: 2, grp: 0, title: "潮空间", pages: "P33-P34",
    imgs: [{ file: "033.webp", w: 4001, h: 2251 }, { file: "034.webp", w: 4001, h: 2251 }] },
  { id: "w12", sec: 2, grp: 1, title: "汉森九号 精酿酒馆", pages: "P35-P36",
    imgs: [{ file: "035.webp", w: 4001, h: 2251 }, { file: "036.webp", w: 4001, h: 2251 }] },
  { id: "w13", sec: 2, grp: 1, title: "探索软冰的世界之旅", pages: "P37-P38",
    imgs: [{ file: "037.webp", w: 4001, h: 2251 }, { file: "038.webp", w: 4001, h: 2251 }] },
  { id: "w14", sec: 2, grp: 2, title: "由甲律师", pages: "P39-P40",
    imgs: [{ file: "039.webp", w: 4001, h: 2251 }, { file: "040.webp", w: 4001, h: 2251 }] },
  { id: "w15", sec: 2, grp: 1, title: "白马河", pages: "P41-P42",
    imgs: [{ file: "041.webp", w: 4001, h: 2251 }, { file: "042.webp", w: 4001, h: 2251 }] },
  { id: "w16", sec: 2, grp: 1, title: "七盏", pages: "P43-P44",
    imgs: [{ file: "043.webp", w: 4001, h: 2251 }, { file: "044.webp", w: 4001, h: 2251 }] },
  { id: "w17", sec: 2, grp: 3, title: "世界最美海湾", pages: "P45-P46",
    imgs: [{ file: "045.webp", w: 4001, h: 2251 }, { file: "046.webp", w: 4001, h: 2251 }] },
  { id: "w18", sec: 2, grp: 4, title: "宠爱友好市", pages: "P47-P48",
    imgs: [{ file: "047.webp", w: 4001, h: 2251 }, { file: "048.webp", w: 4001, h: 2251 }] },
  { id: "w19", sec: 2, grp: 2, title: "Htinin", pages: "P49-P50",
    imgs: [{ file: "049.webp", w: 4001, h: 2251 }, { file: "050.webp", w: 4001, h: 2251 }] },
  { id: "w20", sec: 2, grp: 1, title: "鱼小闲", pages: "P51-P52",
    imgs: [{ file: "051.webp", w: 4001, h: 2251 }, { file: "052.webp", w: 4001, h: 2251 }] },
  { id: "w21", sec: 2, grp: 1, title: "会仙楼饭庄", pages: "P53-P54",
    imgs: [{ file: "053.webp", w: 4001, h: 2251 }, { file: "054.webp", w: 4001, h: 2251 }] },
  { id: "w22", sec: 2, grp: 1, title: "串花巷", pages: "P55-P56",
    imgs: [{ file: "055.webp", w: 4001, h: 2251 }, { file: "056.webp", w: 4001, h: 2251 }] },
  { id: "w23", sec: 2, grp: 5, title: "澳信能源", pages: "P57-P58",
    imgs: [{ file: "057.webp", w: 4001, h: 2251 }, { file: "058.webp", w: 4001, h: 2251 }] },
  { id: "w24", sec: 2, grp: 6, title: "中德建材", pages: "P59-P60",
    imgs: [{ file: "059.webp", w: 4001, h: 2251 }, { file: "060.webp", w: 4001, h: 2251 }] },
  { id: "w25", sec: 2, grp: 7, title: "奈川", pages: "P61-P62",
    imgs: [{ file: "061.webp", w: 4001, h: 2251 }, { file: "062.webp", w: 4001, h: 2251 }] },
  { id: "w26", sec: 2, grp: 4, title: "儒狼/似虎/寻踪", pages: "P63-P68",
    imgs: [{ file: "063.webp", w: 4001, h: 2251 }, { file: "064.webp", w: 4001, h: 2251 }, { file: "065.webp", w: 4001, h: 2251 }, { file: "066.webp", w: 4001, h: 2251 }, { file: "067.webp", w: 4001, h: 2251 }, { file: "068.webp", w: 4001, h: 2251 }] },
  { id: "w27", sec: 3, grp: 0, title: "派贝", pages: "P70-P71",
    imgs: [{ file: "070.webp", w: 4001, h: 2251 }, { file: "071.webp", w: 4001, h: 2251 }] },
  { id: "w28", sec: 3, grp: 0, title: "舔舔乐", pages: "P72-P74",
    imgs: [{ file: "072.webp", w: 4001, h: 2251 }, { file: "073.webp", w: 4001, h: 2251 }, { file: "074.webp", w: 4001, h: 2251 }] },
  { id: "w29", sec: 3, grp: 0, title: "法宝", pages: "P75-P76",
    imgs: [{ file: "075.webp", w: 4001, h: 2251 }, { file: "076.webp", w: 4001, h: 2251 }] },
  { id: "w30", sec: 3, grp: 1, title: "白马河", pages: "P77-P78",
    imgs: [{ file: "077.webp", w: 4001, h: 2251 }, { file: "078.webp", w: 4001, h: 2251 }] },
  { id: "w31", sec: 3, grp: 1, title: "黑鱿精酿", pages: "P79_1",
    imgs: [{ file: "079.webp", w: 4001, h: 2251 }] },
  { id: "w32", sec: 3, grp: 1, title: "醴之岛", pages: "P79_2",
    imgs: [{ file: "079.webp", w: 4001, h: 2251 }] },
  { id: "w33", sec: 3, grp: 1, title: "崮上泉", pages: "P80-P81",
    imgs: [{ file: "080.webp", w: 4001, h: 2251 }, { file: "081.webp", w: 4001, h: 2251 }] },
  { id: "w34", sec: 3, grp: 2, title: "丞芙", pages: "P82-P83",
    imgs: [{ file: "082.webp", w: 4001, h: 2251 }, { file: "083.webp", w: 4001, h: 2251 }] },
  { id: "w35", sec: 3, grp: 1, title: "小泡茶", pages: "P84-P85",
    imgs: [{ file: "084.webp", w: 4001, h: 2251 }, { file: "085.webp", w: 4001, h: 2251 }] },
  { id: "w36", sec: 3, grp: 1, title: "牧美滋", pages: "P86",
    imgs: [{ file: "086.webp", w: 4001, h: 2251 }] },
  { id: "w37", sec: 3, grp: 1, title: "莲藕荷叶膏", pages: "P87",
    imgs: [{ file: "087.webp", w: 4001, h: 2251 }] },
  { id: "w38", sec: 3, grp: 3, title: "NeoSmart", pages: "P88-P89",
    imgs: [{ file: "088.webp", w: 4001, h: 2251 }, { file: "089.webp", w: 4001, h: 2251 }] },
  { id: "w39", sec: 4, grp: 0, title: "排版设计", pages: "P91-P96",
    imgs: [{ file: "091.webp", w: 4001, h: 2251 }, { file: "092.webp", w: 4001, h: 2251 }, { file: "093.webp", w: 4001, h: 2251 }, { file: "094.webp", w: 4001, h: 2251 }, { file: "095.webp", w: 4001, h: 2251 }, { file: "096.webp", w: 4001, h: 2251 }] },
  { id: "w40", sec: 5, grp: 0, title: "爱情博物馆", pages: "P98-P99",
    imgs: [{ file: "098.webp", w: 4001, h: 2251 }, { file: "099.webp", w: 4001, h: 2251 }] },
  { id: "w41", sec: 5, grp: 0, title: "澳柯玛", pages: "P100",
    imgs: [{ file: "100.webp", w: 4001, h: 2251 }] },
  { id: "w42", sec: 5, grp: 0, title: "宠物友好街区", pages: "P101-P102",
    imgs: [{ file: "101.webp", w: 4001, h: 2251 }, { file: "102.webp", w: 4001, h: 2251 }] },
  { id: "w43", sec: 5, grp: 0, title: "乐青", pages: "P103-P104",
    imgs: [{ file: "103.webp", w: 4001, h: 2251 }, { file: "104.webp", w: 4001, h: 2251 }] },
  { id: "w44", sec: 6, grp: 0, title: "青岛往事", pages: "P106-P107",
    imgs: [{ file: "106.webp", w: 3224, h: 2251 }, { file: "107.webp", w: 4001, h: 2251 }] },
  { id: "w45", sec: 6, grp: 1, title: "青岛货币文化展", pages: "P108-P109",
    imgs: [{ file: "108.webp", w: 3245, h: 2251 }, { file: "109.webp", w: 3645, h: 1294 }] },
  { id: "w46", sec: 6, grp: 2, title: "音浪星球 律动之城", pages: "P110",
    imgs: [{ file: "110.webp", w: 3115, h: 1854 }] },
  { id: "w47", sec: 6, grp: 2, title: "匠新共鉴 经典再现", pages: "P111",
    imgs: [{ file: "111.webp", w: 3105, h: 1548 }] },
  { id: "w48", sec: 6, grp: 2, title: "2024宠物供应链展览会", pages: "P112",
    imgs: [{ file: "112.webp", w: 3230, h: 1615 }] },
  { id: "w49", sec: 6, grp: 2, title: "2024海尔制冷产业全球峰会", pages: "P113",
    imgs: [{ file: "113.webp", w: 3797, h: 1055 }] },
  { id: "w50", sec: 6, grp: 3, title: "翡冷翠", pages: "P114-P115",
    imgs: [{ file: "114.webp", w: 3200, h: 2251 }, { file: "115.webp", w: 3200, h: 2251 }] },
  { id: "w51", sec: 6, grp: 3, title: "青啤吨吨杯", pages: "P116",
    imgs: [{ file: "116.webp", w: 3200, h: 2251 }] },
];
