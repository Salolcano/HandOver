import datetime
import importlib.util
import json
import pathlib
import re

import pytest

from tests.direct import stub as stub_module

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "handover.py"

CREATOR = "0x" + "a" * 40
PARTY = "0x" + "b" * 40
PAYEE = "0x" + "c" * 40
STRANGER = "0x" + "d" * 40
T0 = datetime.datetime(2026, 11, 1, tzinfo=datetime.timezone.utc)
GEN = 10 ** 18

URL_A = "https://registry.widget.dev/releases/v2"
URL_B = "https://github.com/widgetworks/widget/releases/tag/v2.0"
PAGE_A = "Widget 2.0 is published under the Apache License 2.0. The changelog lists 2.0 (2026-09-14)."
PAGE_B = "Release v2.0 notes. Licence: Apache License 2.0. Changelog entry added for 2.0."

DEFINITION = {
    "requirements": [
        {"text": "The release states an open-source licence", "rule": "Look for a named licence", "mandatory": True},
        {"text": "A changelog entry exists for the release", "rule": "", "mandatory": True},
        {"text": "A security contact is published", "rule": "", "mandatory": False},
    ],
    "evidence_policy": {"min_sources": 1, "min_publishers": 1},
    "payout": {"partial_bps": 4000},
}


def scripted_llm(answers):
    """A fake model: answers[rid] = (status, quote, evidence_id)."""
    def llm(prompt):
        rid = re.search(r"Requirement (R\d+):", prompt).group(1)
        status, quote, eid = answers[rid]
        return json.dumps({"status": status, "quote": quote, "quote_evidence_id": eid})
    return llm


class Harness:
    def __init__(self):
        self.state = stub_module.install()
        spec = importlib.util.spec_from_file_location("handover_under_test", CONTRACT)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.gl = self.state.gl
        self.sender(CREATOR)
        self.contract = self.module.Handover()
        self.state.pages.update({URL_A: (200, PAGE_A), URL_B: (200, PAGE_B)})

    def sender(self, address, value=0):
        self.gl.message.sender_address = stub_module.Address(address)
        self.gl.message.value = value

    time_source = "message"   # "message" (v0.3 SDK), "raw" (older runners) or "string"

    def at(self, seconds):
        moment = T0 + datetime.timedelta(seconds=seconds)
        self.gl.message_raw = {"datetime": moment.strftime("%Y-%m-%dT%H:%M:%SZ")}
        if self.time_source == "raw":
            self.gl.message.datetime = None
        elif self.time_source == "string":
            self.gl.message_raw = {}
            self.gl.message.datetime = moment.strftime("%Y-%m-%dT%H:%M:%S+00:00")
        else:
            self.gl.message.datetime = moment
            self.gl.message_raw = {}   # the real v0.3 runner had no usable raw time: prove we do not need it

    def expect_fail(self, fn, *args, **kwargs):
        with pytest.raises(self.module.gl.vm.UserError) as info:
            fn(*args, **kwargs)
        return str(info.value)

    def create(self, definition=None, contractor="", deadline=None):
        self.sender(CREATOR)
        self.at(0)
        return self.contract.create_handover(
            "Widget 2.0 release", "widgetworks/widget v2.0", contractor,
            deadline or int(T0.timestamp()) + 7 * 86400, json.dumps(definition or DEFINITION))


@pytest.fixture
def h():
    return Harness()
