from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL = (ROOT / "SKILL.md").read_text()
MANAGEMENT = (ROOT / "references" / "daily-report-management.md").read_text()


def test_producing_is_pending_not_terminal():
    combined = SKILL + "\n" + MANAGEMENT
    assert "data_pending" in combined
    assert "数据产出中" in combined
    assert "复查" in combined
    assert "不得记为 `no_data_update`" in combined
    assert "轻量日期探针" in combined
    assert "主指标、p 值和主截图" in combined
    assert "主指标与所有启用的中间指标" in combined


if __name__ == "__main__":
    test_producing_is_pending_not_terminal()
    print("date probe policy: PASS")
