# ByteDog Authentication

ByteDog API requires a ByteCloud JWT token for authentication. The `bytedcli bytedog` commands handle JWT acquisition and injection automatically via the global `--site` option.

## URL host to auth site

When the user provides a ByteDog page or console URL, choose the `bytedcli --site` value from the URL host.

| ByteDog URL host | `bytedcli --site` | SSO/auth area | Auth check | Login command |
| --- | --- | --- | --- | --- |
| `bytedog.bytedance.net` | `cn` | ByteDance SSO / CN | `bytedcli --site cn --json auth status` | `bytedcli --site cn auth login` |
| `bytedog-boe.bytedance.net` | `boe` | BOE test SSO | `bytedcli --site boe --json auth status` | `bytedcli --site boe auth login` |
| `bytedog.byteintl.net` | `i18n-bd` | ByteDance SSO / ByteIntl | `bytedcli --site i18n-bd --json auth status` | `bytedcli --site i18n-bd auth login` |
| `bytedog-i18n.bytedance.net` | `i18n-tt` | TikTok SSO / ROW | `bytedcli --site i18n-tt --json auth status` | `bytedcli --site i18n-tt auth login` |
| `bytedog-ttp-us.tiktok-row.net` | `us-ttp` | TikTok SSO / US TTP | `bytedcli --site us-ttp --json auth status` | `bytedcli --site us-ttp auth login` |
| `bytedog-ttp-eu.tiktok-row.net` | `eu-ttp` | TikTok SSO / EU TTP | `bytedcli --site eu-ttp --json auth status` | `bytedcli --site eu-ttp auth login` |

## If authentication fails

Check auth status first:

```bash
# Example: CN detail URL
bytedcli --site cn --json auth status

# Example: TikTok ROW detail URL
bytedcli --site i18n-tt --json auth status

# Example: US TTP detail URL
bytedcli --site us-ttp --json auth status

# Example: EU TTP detail URL
bytedcli --site eu-ttp --json auth status
```

If the selected site is not authenticated, log in to the same site:

```bash
bytedcli --site <site> auth login
```
