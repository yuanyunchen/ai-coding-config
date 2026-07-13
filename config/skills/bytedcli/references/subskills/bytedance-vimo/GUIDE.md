---
name: bytedance-vimo
description: "Use when the user needs Vimo Web template package lookup or download from a Vimo template RID, Vimo template resource URL, or lv.ulikecam.com sharevideo URL; use vimocli for Vimo OpenAPI material, panel, category, upload, publish, and service-account workflows."
---

# ByteDance Vimo

Use `bytedcli vimo` for Vimo Web template package lookup and ZIP download.

## Boundary

Use `bytedcli vimo` for:

- Vimo template RID lookup.
- Vimo Web template resource URLs.
- `lv.ulikecam.com/activity/lv/sharevideo?...template_id=...` share links.
- Downloading the signed template ZIP.

Use `vimocli` for:

- Material CRUD.
- Material panel and category operations.
- Upload, publish, update-custom-info, and custom-field workflows.
- Service-account OpenAPI workflows.
- Cross-business material admin tasks.

## Auth

This command uses a Vimo Web OAuth session derived from bytedcli SSO. If auth fails, run:

```bash
bytedcli auth login --session --auto --yes
```

The command refreshes Vimo Web `videocut_sid` from an existing bytedcli SSO session and caches it in bytedcli data. It does not depend on `vimocli` installation, config, login state, or service accounts.

## Commands

```bash
bytedcli vimo template get --rid <rid>
bytedcli vimo template get --url '<vimo resource url>'
bytedcli vimo template get --url '<lv sharevideo url>'
bytedcli vimo template download --rid <rid> --output ./template.zip
```

`get` returns a compact template summary by default: RID, title, status, template ZIP URL, MD5, URL expiry, cover, preview video, template JSON, and proto URL. Use `--include-raw --json` to include the full Vimo resource object.

`download` resolves the signed template ZIP URL, writes a local ZIP, and verifies MD5 when Vimo returns `ItemZipMD5`.

## Business

`--biz` accepts vimocli-style business names or bid values, but does not read vimocli state.

Supported CN values:

- `jianying` / `1`
- `xweb` / `48`
- `xingtu` / `8`
- `xiaoyunque` / `10`

i18n business names such as `capcut`, `hypic`, `mweb`, and `pippit` are recognized but unsupported in the first version.

## URL Inputs

Supported `--url` forms:

```text
https://vimo.bytedance.net/lv/content/template/resource?...&rid=<rid>
https://lv.ulikecam.com/activity/lv/sharevideo?template_id=<rid>&item_type=1
```

For sharevideo URLs, `template_id` is the Vimo template RID. `sec_uid` is ignored. `item_type` must be omitted or `1`.
