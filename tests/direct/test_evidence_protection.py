"""Steward request: unrelated accounts must not be able to fill the evidence set.

The protections under test, all enforced by the contract:
  * only the client, the contractor and submitters they authorize may write evidence;
  * an authorized submitter holds at most MAX_PER_DELEGATE sources;
  * RESERVED_FOR_OWNERS of the twelve slots can never be taken by a delegate;
  * either owner can withdraw or replace any row, so a bad row never holds a slot for good;
  * the same people (not the public) can request a verification or settle an unsettled verdict early.
"""
import json

from tests.direct.conftest import (CREATOR, DEFINITION, PAGE_A, PARTY, STRANGER, T0, URL_A, URL_B,
                                   scripted_llm)

D1, D2, D3 = "0x" + "e" * 40, "0x" + "f" * 40, "0x" + "9" * 40
LIMIT = 12


def url(i):
    return f"https://source{i}.example.org/page"


def handover(h):
    """An ACTIVE handover whose client and contractor are different accounts."""
    pid = h.create(contractor=PARTY)
    h.sender(CREATOR); h.at(10)
    h.contract.freeze_handover(pid)
    h.sender(PARTY)
    h.contract.accept_handover(pid)
    return pid


def add(h, pid, who, i, supports="R1"):
    h.sender(who); h.at(60)
    return h.contract.submit_evidence(pid, url(i), supports)


def authorize(h, pid, *addresses, by=CREATOR):
    h.sender(by); h.at(20)
    for a in addresses:
        h.contract.authorize_submitter(pid, a)


def rows(h, pid):
    return h.contract.get_handover(pid)["evidence"]


def test_unrelated_accounts_cannot_write_to_the_evidence_set(h):
    pid = handover(h)
    for i in range(LIMIT + 1):
        msg = h.expect_fail(add, h, pid, STRANGER, i)
        assert "authorized submitter" in msg
    assert rows(h, pid) == []                        # nothing was taken
    for i in range(LIMIT):                           # and the intended parties still have all twelve
        add(h, pid, CREATOR if i % 2 else PARTY, i)
    assert len(rows(h, pid)) == LIMIT


def test_the_protected_workflow_through_the_twelve_source_limit(h):
    pid = handover(h)

    # only an owner can authorize helpers
    h.sender(STRANGER)
    h.expect_fail(h.contract.authorize_submitter, pid, D1)
    authorize(h, pid, D1, D2, D3)

    # a helper is capped at four
    for i in range(1, 5):
        add(h, pid, D1, i)
    assert "at most 4" in h.expect_fail(add, h, pid, D1, 5)

    # two helpers together can take eight, and no more
    for i in range(5, 9):
        add(h, pid, D2, i)
    assert "reserved" in h.expect_fail(add, h, pid, D3, 9)   # a third helper cannot take the reserve

    # the client and the contractor still have their four slots: the set reaches twelve
    add(h, pid, CREATOR, 9); add(h, pid, CREATOR, 10)
    add(h, pid, PARTY, 11); add(h, pid, PARTY, 12)
    assert len(rows(h, pid)) == LIMIT
    for who in (CREATOR, PARTY):
        assert "at most 12" in h.expect_fail(add, h, pid, who, 13)
    for who in (D1, D2, D3):
        h.expect_fail(add, h, pid, who, 13)
    assert len(rows(h, pid)) == LIMIT

    # the client removes a helper's source and takes the freed slot for the real one
    h.sender(CREATOR); h.at(70)
    first = rows(h, pid)[0]["evidence_id"]
    h.contract.withdraw_evidence(pid, first)
    assert len(rows(h, pid)) == LIMIT - 1
    add(h, pid, CREATOR, 14)
    assert len(rows(h, pid)) == LIMIT
    h.expect_fail(add, h, pid, D3, 15)               # full again, helpers cannot sneak in

    # the contractor swaps a helper's source for a better one without freeing a slot
    old = next(r for r in rows(h, pid) if r["submitter"] == D2)
    h.sender(PARTY); h.at(80)
    new_id = h.contract.replace_evidence(pid, old["evidence_id"], url(20), "R1,R2")
    after = rows(h, pid)
    assert len(after) == LIMIT
    assert old["evidence_id"] not in {r["evidence_id"] for r in after}
    swapped = next(r for r in after if r["evidence_id"] == new_id)
    assert swapped["url"] == url(20) and swapped["submitter"] == PARTY and swapped["replaces"] == old["evidence_id"]


def test_a_delegate_cannot_take_the_slots_reserved_for_the_owners(h):
    pid = handover(h)
    authorize(h, pid, D1, D2, D3)
    for i in range(1, 5):
        add(h, pid, D1, i)
        add(h, pid, D2, i + 4)
    assert len(rows(h, pid)) == 8
    assert "reserved" in h.expect_fail(add, h, pid, D3, 99)
    for i in range(4):                                # the reserve is still all there for the owners
        add(h, pid, CREATOR if i % 2 else PARTY, 100 + i)
    assert len(rows(h, pid)) == LIMIT


def test_a_submitter_can_only_touch_their_own_rows(h):
    pid = handover(h)
    authorize(h, pid, D1, D2)
    mine = add(h, pid, D1, 1)
    h.sender(D2); h.at(65)
    h.expect_fail(h.contract.withdraw_evidence, pid, mine)
    h.expect_fail(h.contract.replace_evidence, pid, mine, url(2), "R1")
    h.sender(STRANGER)
    h.expect_fail(h.contract.withdraw_evidence, pid, mine)
    h.sender(D1)
    h.contract.replace_evidence(pid, mine, url(3), "R1")          # a helper may fix their own row
    h.contract.withdraw_evidence(pid, rows(h, pid)[0]["evidence_id"])
    assert rows(h, pid) == []
    assert h.contract.get_handover(pid)["state"] == "ACTIVE"      # an empty set is open for evidence again


def test_revoking_a_submitter_stops_them_but_leaves_curation_to_the_owners(h):
    pid = handover(h)
    authorize(h, pid, D1)
    kept = add(h, pid, D1, 1)
    h.sender(PARTY); h.at(70)
    h.contract.revoke_submitter(pid, D1)                           # either owner may revoke
    h.expect_fail(add, h, pid, D1, 2)
    h.sender(D1)
    h.expect_fail(h.contract.replace_evidence, pid, kept, url(3), "R1")
    h.sender(CREATOR)
    h.contract.withdraw_evidence(pid, kept)                        # the owners clean up what is left
    assert rows(h, pid) == []
    h.sender(STRANGER)
    h.expect_fail(h.contract.revoke_submitter, pid, D1)


def test_delegation_limits(h):
    pid = handover(h)
    h.sender(CREATOR); h.at(20)
    assert "already an owner" in h.expect_fail(h.contract.authorize_submitter, pid, PARTY)
    for n in range(5):
        h.contract.authorize_submitter(pid, "0x" + f"{n + 1:040x}")
    assert "at most 5" in h.expect_fail(h.contract.authorize_submitter, pid, D1)
    h.expect_fail(h.contract.authorize_submitter, pid, "0x" + f"{1:040x}")   # already authorized
    h.expect_fail(h.contract.authorize_submitter, pid, "not-an-address")


def test_withdrawing_and_replacing_cannot_be_used_to_churn_forever(h):
    pid = handover(h)
    for i in range(36):
        eid = add(h, pid, CREATOR, 1000 + i)
        h.sender(CREATOR)
        h.contract.withdraw_evidence(pid, eid)
    assert "36" in h.expect_fail(add, h, pid, CREATOR, 2000)


def test_curation_and_early_acceptance_are_locked_once_a_verdict_stands(h):
    pid = handover(h)
    eid = add(h, pid, CREATOR, 0, "R1,R2,R3")
    h.state.pages[url(0)] = (200, PAGE_A)
    h.state.llm = scripted_llm({"R1": ("MET", "Apache License 2.0", eid),
                                "R2": ("MET", "The changelog lists 2.0", eid),
                                "R3": ("MET", "Apache License 2.0", eid)})
    h.sender(STRANGER); h.at(100)
    assert "authorized submitter" in h.expect_fail(h.contract.request_verification, pid)  # not for the public
    h.sender(PARTY)
    assert h.contract.request_verification(pid) == "VERIFIED"
    h.sender(CREATOR); h.at(110)
    h.expect_fail(h.contract.withdraw_evidence, pid, eid)          # a standing verdict cannot be edited away
    h.expect_fail(add, h, pid, CREATOR, 1)


def test_replaced_evidence_is_what_gets_verified_and_unsettled_verdicts_stay_with_the_owners(h):
    h.state.pages[url(0)] = (503, "")                               # the first source is unreadable
    h.state.pages[url(1)] = (200, PAGE_A)
    pid = handover(h)
    first = add(h, pid, CREATOR, 0, "R1,R2,R3")
    h.state.llm = scripted_llm({"R1": ("UNRESOLVED", "", ""), "R2": ("UNRESOLVED", "", ""),
                                "R3": ("UNRESOLVED", "", "")})
    h.sender(CREATOR); h.at(100)
    assert h.contract.request_verification(pid) == "INCONCLUSIVE"

    # a stranger cannot slam the door on an unsettled verdict before the deadline
    h.sender(STRANGER); h.at(100 + 400)
    h.expect_fail(h.contract.accept_verification, pid)

    # the client replaces the bad source and verifies again; only the new row is read
    h.sender(CREATOR); h.at(520)
    second = h.contract.replace_evidence(pid, first, url(1), "R1,R2,R3")
    h.state.llm = scripted_llm({"R1": ("MET", "Apache License 2.0", second),
                                "R2": ("MET", "The changelog lists 2.0", second),
                                "R3": ("MET", "Apache License 2.0", second)})
    assert h.contract.request_verification(pid) == "VERIFIED"
    record = h.contract.get_verification(pid, 1)
    assert [s["evidence_id"] for s in record["sources"]] == [second]

    # after the deadline anyone may close out an unsettled verdict, so nothing is stuck
    pid2 = handover(h)
    add(h, pid2, CREATOR, 0, "R1,R2,R3")
    h.state.llm = scripted_llm({"R1": ("UNRESOLVED", "", ""), "R2": ("UNRESOLVED", "", ""),
                                "R3": ("UNRESOLVED", "", "")})
    h.sender(CREATOR); h.at(100)
    assert h.contract.request_verification(pid2) == "INCONCLUSIVE"
    h.sender(STRANGER); h.at(8 * 86400)
    assert h.contract.accept_verification(pid2) == "ACCEPTED"
