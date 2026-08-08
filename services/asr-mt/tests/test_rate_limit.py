from app import main


def test_rate_limit_allows_until_limit_then_blocks():
    assert main._is_rate_limited("scope", "identity", 2) is False
    assert main._is_rate_limited("scope", "identity", 2) is False
    assert main._is_rate_limited("scope", "identity", 2) is True


def test_rate_limit_zero_disables_limit():
    for _ in range(5):
        assert main._is_rate_limited("scope", "identity", 0) is False


def test_rate_limit_isolated_by_identity():
    assert main._is_rate_limited("scope", "a", 1) is False
    assert main._is_rate_limited("scope", "a", 1) is True
    assert main._is_rate_limited("scope", "b", 1) is False
