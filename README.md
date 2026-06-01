# 民德搓澡堂 业绩看板

23店月度经营数据看板，通过 GitHub Pages 部署。

在线地址: https://hddcghs-dev.github.io/-performance-dashboard/

## 更新数据

数据源在 `../业绩看板_优化版/基础数据/民德时代业绩看板.xlsx`，每月更新后：

```
cd ../业绩看板_优化版
python generate_json.py
cp dashboard_data.json ../github-pages-deploy/
cd ../github-pages-deploy
git add dashboard_data.json
git commit -m "更新YYYY年M月业绩数据"
git push origin main
```
