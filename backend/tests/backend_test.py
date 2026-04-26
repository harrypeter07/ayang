"""Backend tests for RCC Leads API."""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE:
    # Fall back to reading frontend .env
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE = ln.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE}/api"

ADMIN = {"email": "harsh.redctrlcut@gmail.com", "password": "H@rsh#Leads7821!"}
FILLER = {"email": "yasmeen.redctrlcut@gmail.com", "password": "Y@sm33n#Leads918!"}

UNIQ = uuid.uuid4().hex[:8]
CLOSER_EMAIL = f"test_closer_{UNIQ}@example.com"
CLOSER_PASS = "Closer#Pass123!"

state = {}  # shared state across tests


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    return r


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- AUTH ----------
def test_01_login_admin():
    r = _login(ADMIN)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "admin" and d["token"] and d["email"] == ADMIN["email"]
    state["admin_token"] = d["token"]
    state["admin_id"] = d["id"]


def test_02_login_filler():
    r = _login(FILLER)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "lead_filler" and d["token"]
    state["filler_token"] = d["token"]
    state["filler_id"] = d["id"]


def test_03_login_wrong_password():
    r = _login({"email": ADMIN["email"], "password": "WRONG"})
    assert r.status_code == 401


def test_04_me_with_token():
    r = requests.get(f"{API}/auth/me", headers=_h(state["admin_token"]))
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]


def test_05_me_without_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- USER MGMT ----------
def test_06_admin_creates_closer():
    body = {"email": CLOSER_EMAIL, "password": CLOSER_PASS, "name": "TEST Closer", "role": "closer"}
    r = requests.post(f"{API}/users", json=body, headers=_h(state["admin_token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "closer" and d["email"] == CLOSER_EMAIL
    assert "_id" not in d and "password_hash" not in d
    state["closer_id"] = d["id"]
    # login as closer to get token
    rl = _login({"email": CLOSER_EMAIL, "password": CLOSER_PASS})
    assert rl.status_code == 200
    state["closer_token"] = rl.json()["token"]


def test_07_non_admin_create_user_forbidden():
    body = {"email": f"TEST_x_{UNIQ}@x.com", "password": "x", "name": "x", "role": "closer"}
    r = requests.post(f"{API}/users", json=body, headers=_h(state["filler_token"]))
    assert r.status_code == 403


def test_08_list_closers_admin():
    r = requests.get(f"{API}/users/closers", headers=_h(state["admin_token"]))
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert state["closer_id"] in ids


def test_09_list_closers_filler():
    r = requests.get(f"{API}/users/closers", headers=_h(state["filler_token"]))
    assert r.status_code == 200
    assert any(c["id"] == state["closer_id"] for c in r.json())


def test_09b_list_closers_closer_forbidden():
    r = requests.get(f"{API}/users/closers", headers=_h(state["closer_token"]))
    assert r.status_code == 403


# ---------- LEADS ----------
def test_10_filler_creates_lead():
    body = {
        "instagram_id": f"TEST_ig_{UNIQ}",
        "business_name": "TEST Biz",
        "phone": f"9{UNIQ}",
        "category": "fashion",
        "notes": "hi",
        "assigned_closer_id": state["closer_id"],
    }
    r = requests.post(f"{API}/leads", json=body, headers=_h(state["filler_token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "not_called"
    assert d["assigned_closer_id"] == state["closer_id"]
    assert d["assigned_closer_name"] == "TEST Closer"
    assert d["instagram_id"] == body["instagram_id"]
    state["lead_id"] = d["id"]
    state["lead_phone"] = body["phone"]
    state["lead_ig"] = body["instagram_id"]


def test_11_duplicate_phone_409():
    body = {
        "instagram_id": f"TEST_ig_other_{UNIQ}",
        "business_name": "B", "phone": state["lead_phone"], "category": "x",
    }
    r = requests.post(f"{API}/leads", json=body, headers=_h(state["filler_token"]))
    assert r.status_code == 409


def test_12_duplicate_instagram_409():
    body = {
        "instagram_id": state["lead_ig"],
        "business_name": "B", "phone": f"8{UNIQ}", "category": "x",
    }
    r = requests.post(f"{API}/leads", json=body, headers=_h(state["filler_token"]))
    assert r.status_code == 409


def test_13_closer_sees_only_assigned():
    # Create a second lead unassigned (admin)
    other = {
        "instagram_id": f"TEST_unassigned_{UNIQ}",
        "business_name": "U", "phone": f"7{UNIQ}", "category": "x",
    }
    rc = requests.post(f"{API}/leads", json=other, headers=_h(state["admin_token"]))
    assert rc.status_code == 200
    state["unassigned_lead_id"] = rc.json()["id"]

    r = requests.get(f"{API}/leads", headers=_h(state["closer_token"]))
    assert r.status_code == 200
    leads = r.json()
    assert all(l["assigned_closer_id"] == state["closer_id"] for l in leads)
    assert any(l["id"] == state["lead_id"] for l in leads)
    assert all(l["id"] != state["unassigned_lead_id"] for l in leads)


def test_14_admin_sees_all():
    r = requests.get(f"{API}/leads", headers=_h(state["admin_token"]))
    assert r.status_code == 200
    ids = [l["id"] for l in r.json()]
    assert state["lead_id"] in ids and state["unassigned_lead_id"] in ids


def test_15_search_instagram_case_insensitive():
    q = state["lead_ig"].upper()
    r = requests.get(f"{API}/leads", params={"search": q}, headers=_h(state["admin_token"]))
    assert r.status_code == 200
    assert any(l["id"] == state["lead_id"] for l in r.json())


def test_16_follow_up_today_filter():
    # set lead to follow_up with today's date
    today = datetime.now(timezone.utc).date().isoformat()
    body = {"status": "follow_up", "closer_notes": "callback later", "follow_up_date": today}
    r = requests.patch(f"{API}/leads/{state['lead_id']}/status", json=body, headers=_h(state["closer_token"]))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "follow_up"
    assert r.json()["follow_up_date"] == today

    rf = requests.get(f"{API}/leads", params={"follow_up_today": "true"}, headers=_h(state["admin_token"]))
    assert rf.status_code == 200
    ids = [l["id"] for l in rf.json()]
    assert state["lead_id"] in ids


def test_17_update_lead_reassign():
    # Create another closer to reassign
    e2 = f"test_closer2_{UNIQ}@example.com"
    rc = requests.post(f"{API}/users",
                       json={"email": e2, "password": "P@ssw0rd!", "name": "TEST Closer2", "role": "closer"},
                       headers=_h(state["admin_token"]))
    assert rc.status_code == 200
    new_closer_id = rc.json()["id"]
    state["closer2_id"] = new_closer_id

    body = {"business_name": "TEST Updated", "assigned_closer_id": new_closer_id}
    r = requests.put(f"{API}/leads/{state['lead_id']}", json=body, headers=_h(state["filler_token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["business_name"] == "TEST Updated"
    assert d["assigned_closer_id"] == new_closer_id
    assert d["assigned_closer_name"] == "TEST Closer2"

    # Reassign back to original closer for next tests
    requests.put(f"{API}/leads/{state['lead_id']}",
                 json={"assigned_closer_id": state["closer_id"]},
                 headers=_h(state["admin_token"]))


def test_18_status_follow_up_requires_date():
    body = {"status": "follow_up", "closer_notes": "no date"}
    r = requests.patch(f"{API}/leads/{state['lead_id']}/status", json=body, headers=_h(state["closer_token"]))
    assert r.status_code == 400


def test_19_closer_cannot_update_others_lead():
    body = {"status": "called", "closer_notes": "trying"}
    r = requests.patch(f"{API}/leads/{state['unassigned_lead_id']}/status", json=body, headers=_h(state["closer_token"]))
    assert r.status_code == 403


def test_20_closer_cannot_delete():
    r = requests.delete(f"{API}/leads/{state['lead_id']}", headers=_h(state["closer_token"]))
    assert r.status_code == 403


def test_21_stats_admin():
    # set status to approved on assigned lead so stats has data
    body = {"status": "approved", "closer_notes": "done"}
    rp = requests.patch(f"{API}/leads/{state['lead_id']}/status", json=body, headers=_h(state["closer_token"]))
    assert rp.status_code == 200, rp.text

    r = requests.get(f"{API}/stats/closer-activity", headers=_h(state["admin_token"]))
    assert r.status_code == 200
    data = r.json()
    found = next((x for x in data if x["closer_id"] == state["closer_id"]), None)
    assert found is not None
    assert found["total"] >= 1
    assert "approved" in found["by_status"]


def test_22_stats_non_admin_forbidden():
    r = requests.get(f"{API}/stats/closer-activity", headers=_h(state["filler_token"]))
    assert r.status_code == 403


def test_23_filler_can_delete_lead():
    r = requests.delete(f"{API}/leads/{state['unassigned_lead_id']}", headers=_h(state["filler_token"]))
    assert r.status_code == 200
    rg = requests.get(f"{API}/leads", headers=_h(state["admin_token"]))
    assert all(l["id"] != state["unassigned_lead_id"] for l in rg.json())


def test_99_cleanup():
    # Delete remaining test lead and test users
    requests.delete(f"{API}/leads/{state['lead_id']}", headers=_h(state["admin_token"]))
    for k in ("closer_id", "closer2_id"):
        cid = state.get(k)
        if cid:
            requests.delete(f"{API}/users/{cid}", headers=_h(state["admin_token"]))
