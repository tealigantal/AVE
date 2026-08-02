<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-049 Delivery/Privacy/Rights Host Gates

## Outcome

Project Host 通过 Core 保存 Privacy、Rights 和 Delivery 门控；所有交付条件通过后才写入 ready manifest。

## Validation

- `npm run delivery:host:test`
- `npm run check`

## Evidence

敏感隐私无动作和 blocked QC 被拒绝；通过的 privacy/rights/delivery 写入 `delivery_records` 并产生事件。

## Remaining Risk

真实导出登记、Export Capability API、平台格式验收和 Electron 交付 UI 仍待完成。
