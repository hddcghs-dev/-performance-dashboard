const STORE_ORDER = Object.freeze([
  '民德路店',
  '红谷滩店',
  '抚河桥店',
  '抚州高新店',
  '朝阳店',
  '京东天虹店',
  '赣州店',
  '万年店',
  '九江中航城店',
  '九江万达店',
  '婺源店',
  '杭州西溪天街店',
  '新余店',
  '台州椒江店',
  '南康店',
  '青岛店',
  '萍乡店',
  '温州时代店',
  '台州路桥店',
  '鹰潭月湖店',
  '宜春店',
  '杭州市中心店',
  '合肥经开店',
  '泉州兴贤路店',
  '福州世欧王庄五里亭店',
  '南通山姆店',
]);

const STORE_INDEX = new Map(STORE_ORDER.map((store, index) => [store, index]));

function compareStoreNames(left, right) {
  const leftIndex = STORE_INDEX.get(left);
  const rightIndex = STORE_INDEX.get(right);
  if (leftIndex != null || rightIndex != null) {
    return (leftIndex ?? Number.MAX_SAFE_INTEGER) - (rightIndex ?? Number.MAX_SAFE_INTEGER);
  }
  return String(left).localeCompare(String(right), 'zh-Hans-CN');
}

function orderStores(items, getStore = (item) => item) {
  return [...items].sort((left, right) => compareStoreNames(getStore(left), getStore(right)));
}

module.exports = { STORE_ORDER, compareStoreNames, orderStores };
