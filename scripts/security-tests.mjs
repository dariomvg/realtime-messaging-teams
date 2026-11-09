/**
 * Security tests: attacks the system the way a real attacker would
 * (anon key + a signed-in user's token, straight against the API).
 *
 * Needs: Node 20.6+ (Node 22+ also runs the realtime tests), the dev server running
 * for the route tests, and these variables (keep the TEST_* ones in a separate,
 * git-ignored file such as .env.test.local):
 *
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 *   TEST_WORKER_A_EMAIL / TEST_WORKER_A_PASSWORD
 *   TEST_WORKER_B_EMAIL / TEST_WORKER_B_PASSWORD
 *
 * Worker A and B must be real workers with DIFFERENT positions and
 * password_changed = true.
 *
 * Run:
 *   node --env-file=.env.local --env-file=.env.test.local scripts/security-tests.mjs
 *
 * It only creates test messages (tagged __sec_test_...) and deletes them at the end.
 * Tests that could be destructive are aimed at a non-existent user id.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_WORKER_A_EMAIL,
  TEST_WORKER_A_PASSWORD,
  TEST_WORKER_B_EMAIL,
  TEST_WORKER_B_PASSWORD,
} = process.env;

const TAG = `__sec_test_${Date.now()}__`;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let passed = 0;
let failed = 0;
let skipped = 0;

const section = (title) => console.log(`\n== ${title} ==`);
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `  -> ${detail}` : ""}`);
  }
}
function skip(name, why) {
  skipped++;
  console.log(`  SKIP  ${name}  (${why})`);
}

/** Nothing came back: an error, no data, or zero rows. */
const denied = (res) =>
  Boolean(res.error) || res.data == null || (Array.isArray(res.data) && res.data.length === 0);
/** The database itself refused (permission denied / policy violation). */
const errored = (res) => Boolean(res.error);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const newClient = () => createClient(SUPABASE_URL, ANON_KEY, clientOptions);

async function login(email, password) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Login failed for ${email}: ${error?.message}`);
  return { client, token: data.session.access_token, userId: data.user.id };
}

async function callFunction(name, token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token ?? ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.status;
}

function subscribe(channel, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve(true);
      }
    });
  });
}

async function main() {
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY],
    ["TEST_ADMIN_EMAIL", TEST_ADMIN_EMAIL],
    ["TEST_ADMIN_PASSWORD", TEST_ADMIN_PASSWORD],
    ["TEST_WORKER_A_EMAIL", TEST_WORKER_A_EMAIL],
    ["TEST_WORKER_A_PASSWORD", TEST_WORKER_A_PASSWORD],
    ["TEST_WORKER_B_EMAIL", TEST_WORKER_B_EMAIL],
    ["TEST_WORKER_B_PASSWORD", TEST_WORKER_B_PASSWORD],
  ].filter(([, value]) => !value);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.map(([name]) => name).join(", ")}`);
  }

  const anon = newClient();
  const admin = await login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
  const wA = await login(TEST_WORKER_A_EMAIL, TEST_WORKER_A_PASSWORD);
  const wB = await login(TEST_WORKER_B_EMAIL, TEST_WORKER_B_PASSWORD);

  const ownA = await wA.client.from("profiles").select("*");
  const ownB = await wB.client.from("profiles").select("*");
  const posA = ownA.data?.[0]?.position;
  const posB = ownB.data?.[0]?.position;
  if (!posA || !posB || posA === posB) {
    throw new Error("Worker A and B need different, non-empty positions.");
  }
  const adminRole = await admin.client
    .from("profiles")
    .select("role")
    .eq("user_id", admin.userId)
    .single();
  if (adminRole.data?.role !== "admin") throw new Error("TEST_ADMIN is not an admin.");

  let channels = [];
  try {
    // ------------------------------------------------------------------
    section("Setup (realtime listeners + test messages)");
    const hasWebSocket = typeof WebSocket !== "undefined";
    let controlGotEvent = false;
    let leakedToOtherWorker = false;
    let realtimeReady = false;

    if (hasWebSocket) {
      const chA = wA.client
        .channel(`sec-a-${TAG}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_recipients",
            filter: `user_id=eq.${wA.userId}`,
          },
          (payload) => {
            if (payload.new?.user_id === wA.userId) controlGotEvent = true;
          },
        );
      const chB = wB.client
        .channel(`sec-b-${TAG}`)
        // No filter on purpose: B tries to hear everything.
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "message_recipients" },
          (payload) => {
            if (payload.new?.user_id !== wB.userId) leakedToOtherWorker = true;
          },
        );
      channels = [
        [wA.client, chA],
        [wB.client, chB],
      ];
      realtimeReady = (await subscribe(chA)) && (await subscribe(chB));
    }

    const insA = await admin.client
      .from("messages")
      .insert({ recipient_position: posA, description: TAG, content: "security test A" })
      .select("id")
      .single();
    const insB = await admin.client
      .from("messages")
      .insert({ recipient_position: posB, description: TAG, content: "security test B" })
      .select("id")
      .single();
    if (insA.error || insB.error) {
      throw new Error(`Admin could not create test messages: ${insA.error?.message ?? insB.error?.message}`);
    }
    const msgA = insA.data.id;
    const msgB = insB.data.id;
    await sleep(3000);

    // ------------------------------------------------------------------
    section("1. Anonymous visitor (no session)");
    check("cannot read profiles", denied(await anon.from("profiles").select("*")));
    check("cannot read messages", denied(await anon.from("messages").select("*")));
    check("cannot read message_recipients", denied(await anon.from("message_recipients").select("*")));
    check(
      "cannot insert messages",
      errored(await anon.from("messages").insert({ recipient_position: posA, description: TAG, content: "x" })),
    );
    check("cannot call is_admin()", errored(await anon.rpc("is_admin")));
    check("cannot call mark_password_changed()", errored(await anon.rpc("mark_password_changed")));
    check("cannot call mark_message_read()", errored(await anon.rpc("mark_message_read", { p_message_id: msgA })));
    const signup = await anon.auth.signUp({
      email: `sec-test-${Date.now()}@example.com`,
      password: "Sec-test-Pass-12345",
    });
    check(
      "public sign up is disabled",
      Boolean(signup.error),
      "sign up WORKED: disable it in Supabase Auth and delete the stray test user",
    );
    check("create-worker rejects the anon key (401)", (await callFunction("create-worker", null, {})) === 401);
    check("delete-worker rejects the anon key (401)", (await callFunction("delete-worker", null, { userId: ZERO_UUID })) === 401);

    // ------------------------------------------------------------------
    section("2. Realtime isolation");
    if (!hasWebSocket) {
      skip("realtime tests", "needs Node 22+ (global WebSocket)");
    } else if (!realtimeReady) {
      skip("realtime tests", "could not subscribe");
    } else {
      check("control: worker A receives its own recipient event", controlGotEvent);
      check("worker B receives nothing about worker A", !leakedToOtherWorker);
    }

    // ------------------------------------------------------------------
    section("3. Worker A reads");
    check(
      "sees only their own profile",
      ownA.data?.length === 1 && ownA.data[0].user_id === wA.userId,
    );
    const aMessages = await wA.client.from("messages").select("id").eq("id", msgA);
    check("sees a message sent to their position", aMessages.data?.length === 1);
    const aOtherMessage = await wA.client.from("messages").select("id").eq("id", msgB);
    check("cannot read a message sent to another position", denied(aOtherMessage));
    const aRecipients = await wA.client.from("message_recipients").select("user_id");
    check(
      "sees only their own recipient rows",
      !aRecipients.error && aRecipients.data.every((row) => row.user_id === wA.userId),
    );
    const bMessages = await wB.client.from("messages").select("id").eq("id", msgA);
    check("worker B cannot read worker A's message", denied(bMessages));

    // ------------------------------------------------------------------
    section("4. Worker A tries to write (privilege escalation / tampering)");
    check(
      "cannot make themselves admin",
      denied(await wA.client.from("profiles").update({ role: "admin" }).eq("user_id", wA.userId).select()),
    );
    check(
      "cannot change their own position",
      denied(await wA.client.from("profiles").update({ position: posB }).eq("user_id", wA.userId).select()),
    );
    check(
      "cannot flip password_changed directly",
      denied(await wA.client.from("profiles").update({ password_changed: false }).eq("user_id", wA.userId).select()),
    );
    check(
      "cannot create profiles",
      errored(await wA.client.from("profiles").insert({ user_id: ZERO_UUID, name: "x", role: "admin" }).select()),
    );
    check(
      "cannot delete profiles",
      denied(await wA.client.from("profiles").delete().eq("user_id", wB.userId).select()),
    );
    const afterProfile = await wA.client.from("profiles").select("role, position").single();
    check(
      "their profile is unchanged",
      afterProfile.data?.role === "worker" && afterProfile.data?.position === posA,
    );
    check(
      "cannot send messages",
      errored(await wA.client.from("messages").insert({ recipient_position: posA, description: TAG, content: "x" })),
    );
    check(
      "cannot delete messages",
      denied(await wA.client.from("messages").delete().eq("id", msgA).select()),
    );
    check(
      "cannot change a message's position",
      denied(await wA.client.from("messages").update({ recipient_position: posB }).eq("id", msgA).select()),
    );
    check(
      "cannot write read_at directly",
      denied(
        await wA.client
          .from("message_recipients")
          .update({ read_at: new Date().toISOString() })
          .eq("message_id", msgA)
          .select(),
      ),
    );
    check(
      "cannot grant themselves another position's message",
      errored(
        await wA.client.from("message_recipients").insert({ message_id: msgB, user_id: wA.userId }).select(),
      ),
    );
    check(
      "still cannot read that message",
      denied(await wA.client.from("messages").select("id").eq("id", msgB)),
    );
    check(
      "cannot delete recipient rows",
      denied(await wA.client.from("message_recipients").delete().eq("message_id", msgA).select()),
    );
    check("cannot call trigger functions directly", errored(await wA.client.rpc("fan_out_message")));
    const stillThere = await admin.client.from("messages").select("recipient_position").eq("id", msgA).single();
    check("test message is intact", stillThere.data?.recipient_position === posA);

    // ------------------------------------------------------------------
    section("5. Read tracking (mark_message_read)");
    const unread = await admin.client
      .from("message_recipients")
      .select("read_at")
      .eq("message_id", msgA)
      .eq("user_id", wA.userId)
      .single();
    check("recipient starts unread", unread.data?.read_at === null);
    const markOwn = await wA.client.rpc("mark_message_read", { p_message_id: msgA });
    check("worker can mark their own message as read", !markOwn.error);
    const firstRead = await admin.client
      .from("message_recipients")
      .select("read_at")
      .eq("message_id", msgA)
      .eq("user_id", wA.userId)
      .single();
    check("read_at was set", Boolean(firstRead.data?.read_at));
    await sleep(1100);
    await wA.client.rpc("mark_message_read", { p_message_id: msgA });
    const secondRead = await admin.client
      .from("message_recipients")
      .select("read_at")
      .eq("message_id", msgA)
      .eq("user_id", wA.userId)
      .single();
    check("read_at is not overwritten on a second call", secondRead.data?.read_at === firstRead.data?.read_at);
    await wA.client.rpc("mark_message_read", { p_message_id: msgB });
    const otherRow = await admin.client
      .from("message_recipients")
      .select("read_at")
      .eq("message_id", msgB)
      .eq("user_id", wB.userId)
      .single();
    check("cannot mark another worker's message as read", otherRow.data?.read_at === null);

    // ------------------------------------------------------------------
    section("6. Edge Functions");
    check("create-worker: worker is rejected (403)", (await callFunction("create-worker", wA.token, {})) === 403);
    check(
      "delete-worker: worker is rejected (403)",
      (await callFunction("delete-worker", wA.token, { userId: ZERO_UUID })) === 403,
    );
    check("create-worker: admin with empty body -> 400", (await callFunction("create-worker", admin.token, {})) === 400);
    check(
      "create-worker: duplicate email -> 409",
      (await callFunction("create-worker", admin.token, {
        name: "Sec Test",
        email: TEST_WORKER_A_EMAIL,
        password: "Sec-test-Pass-12345",
        position: posA,
      })) === 409,
    );
    check(
      "delete-worker: invalid id -> 400",
      (await callFunction("delete-worker", admin.token, { userId: "not-a-uuid" })) === 400,
    );
    check(
      "delete-worker: unknown id -> 404",
      (await callFunction("delete-worker", admin.token, { userId: ZERO_UUID })) === 404,
    );
    check(
      "delete-worker: an admin cannot be deleted (not even yourself) -> 403",
      (await callFunction("delete-worker", admin.token, { userId: admin.userId })) === 403,
    );

    // ------------------------------------------------------------------
    section("7. Admin limits (even admins cannot bypass the design)");
    const allProfiles = await admin.client.from("profiles").select("user_id");
    check("admin can read all profiles", (allProfiles.data?.length ?? 0) >= 3);
    const recipientsA = await admin.client.from("message_recipients").select("user_id").eq("message_id", msgA);
    check(
      "fan-out delivered to position A only",
      recipientsA.data?.some((row) => row.user_id === wA.userId) &&
        !recipientsA.data?.some((row) => row.user_id === wB.userId),
    );
    check("admin cannot change roles", errored(await admin.client.from("profiles").update({ role: "admin" }).eq("user_id", ZERO_UUID)));
    check("admin cannot edit names/flags", errored(await admin.client.from("profiles").update({ name: "x" }).eq("user_id", ZERO_UUID)));
    check("admin cannot insert profiles directly", errored(await admin.client.from("profiles").insert({ user_id: ZERO_UUID, name: "x" })));
    check("admin cannot delete profiles directly", errored(await admin.client.from("profiles").delete().eq("user_id", ZERO_UUID)));
    check("admin cannot edit message content", errored(await admin.client.from("messages").update({ content: "x" }).eq("id", msgA)));
    check(
      "admin cannot write message_recipients directly",
      errored(await admin.client.from("message_recipients").update({ read_at: null }).eq("message_id", msgA)),
    );

    await admin.client.from("messages").update({ recipient_position: posB }).eq("id", msgA);
    const moved = await admin.client.from("message_recipients").select("user_id, read_at").eq("message_id", msgA);
    check(
      "reassigning a message moves its recipients (unread) to the new position",
      moved.data?.every((row) => row.user_id !== wA.userId) &&
        moved.data?.some((row) => row.user_id === wB.userId) &&
        moved.data?.every((row) => row.read_at === null),
    );
    const lostAccess = await wA.client.from("messages").select("id").eq("id", msgA);
    check("the old position loses access", denied(lostAccess));

    // ------------------------------------------------------------------
    section("8. Next.js routes without a session (dev server must be running)");
    for (const path of ["/dashboard", "/inbox", "/change-password", "/no-access", "/reset-password"]) {
      try {
        const res = await fetch(`${SITE}${path}`, { redirect: "manual" });
        const location = res.headers.get("location");
        const toLogin =
          res.status >= 300 && res.status < 400 && location && new URL(location, SITE).pathname === "/login";
        check(`${path} redirects to /login`, Boolean(toLogin), `status ${res.status}, location ${location}`);
      } catch {
        skip(`${path} redirects to /login`, "dev server not reachable");
      }
    }
  } finally {
    section("Cleanup");
    const cleanup = await admin.client.from("messages").delete().eq("description", TAG);
    console.log(cleanup.error ? `  could not delete test messages: ${cleanup.error.message}` : "  test messages deleted");
    for (const [client, channel] of channels) await client.removeChannel(channel);
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nAborted: ${error.message}`);
  process.exit(1);
});
