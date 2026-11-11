"""An in-process stand-in for the GenVM SDK, so the contract's logic runs in CI
with no network, no node and no model. It is NOT a replacement for GenVM: the
authoritative check is `genvm-lint` plus the live Studio Next run. What it does
prove is the part of Handover that is ordinary code -- permissions, custody,
the derived result, the payout arithmetic, the registry -- and that the
non-deterministic closure only ever returns what the contract then re-checks.
"""
import re
import sys
import types


class UserError(Exception):
    pass


class Address:
    def __init__(self, value):
        if not isinstance(value, str) or not re.fullmatch(r"0x[0-9a-fA-F]{40}", value):
            raise ValueError("bad address")
        self.as_hex = value

    def __repr__(self):
        return self.as_hex


class TreeMap(dict):
    def __class_getitem__(cls, item):
        return cls


class DynArray(list):
    def __class_getitem__(cls, item):
        return cls


class Contract:
    def __new__(cls, *args, **kwargs):
        obj = object.__new__(cls)
        for klass in cls.__mro__:
            for name, ann in getattr(klass, "__annotations__", {}).items():
                if ann is TreeMap:
                    object.__setattr__(obj, name, TreeMap())
                elif ann is DynArray:
                    object.__setattr__(obj, name, DynArray())
        return obj


class Transfers(list):
    pass


def install():
    """Build a fake `genlayer` package and return the handle tests drive."""
    state = types.SimpleNamespace(transfers=Transfers(), pages={}, llm=None, calls=0)

    gl = types.ModuleType("genlayer")
    types_mod = types.ModuleType("genlayer.types")
    types_mod.u256 = int
    types_mod.Address = Address
    gl.types = types_mod

    gl.contract = types.SimpleNamespace(Contract=Contract)
    gl.storage = types.SimpleNamespace(TreeMap=TreeMap, DynArray=DynArray)
    gl.vm = types.SimpleNamespace(UserError=UserError)

    def view(fn):
        return fn

    def write(fn):
        return fn

    write.payable = lambda fn: fn
    gl.public = types.SimpleNamespace(view=view, write=write)

    def contract_interface(cls):
        class Bound:
            def __init__(self, address):
                self.address = address

            def emit_transfer(self, value=0):
                state.transfers.append((self.address.as_hex.lower(), int(value)))

        return Bound

    gl.evm = types.SimpleNamespace(contract_interface=contract_interface)
    gl.message = types.SimpleNamespace(sender_address=Address("0x" + "1" * 40), value=0, datetime=None)
    gl.message_raw = {}

    class _Response:
        def __init__(self, status, body):
            self.status, self.body = status, body

    def web_get(url, headers=None):
        page = state.pages.get(url)
        if page is None:
            return _Response(404, b"")
        status, body = page
        return _Response(status, body.encode("utf-8"))

    def web_render(url, mode="text"):
        page = state.pages.get(url)
        return page[1] if page and page[0] < 400 else ""

    def exec_prompt(prompt, **kwargs):
        state.calls += 1
        return state.llm(prompt)

    gl.nondet = types.SimpleNamespace(
        web=types.SimpleNamespace(get=web_get, render=web_render), exec_prompt=exec_prompt)
    gl.eq_principle = types.SimpleNamespace(
        prompt_comparative=lambda fn, principle: fn(), strict_eq=lambda fn: fn())

    sys.modules["genlayer"] = gl
    sys.modules["genlayer.types"] = types_mod
    state.gl = gl
    return state
