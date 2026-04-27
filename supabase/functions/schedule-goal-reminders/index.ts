// Daily cron — inserts a reminder notification for each user with pending learning goals.
// Idempotent per day: skips users who already have a goal_reminder for today.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // 1. Fetch all pending goals
    const goalsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/learning_goals?status=eq.pending&select=id,user_id,topic,target_date`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const goals = await goalsRes.json() as Array<{ id: string; user_id: string; topic: string; target_date: string | null }>;

    // Group by user
    const byUser = new Map<string, typeof goals>();
    for (const g of goals) {
      const arr = byUser.get(g.user_id) ?? [];
      arr.push(g);
      byUser.set(g.user_id, arr);
    }

    const today = new Date().toISOString().slice(0, 10);
    const created: string[] = [];
    const skipped: string[] = [];

    for (const [userId, userGoals] of byUser) {
      // Skip if already notified today
      const existRes = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${userId}&type=eq.goal_reminder&created_at=gte.${today}T00:00:00Z&select=id&limit=1`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
      );
      const exist = await existRes.json();
      if (Array.isArray(exist) && exist.length > 0) { skipped.push(userId); continue; }

      const overdue = userGoals.filter((g) => g.target_date && new Date(g.target_date) < new Date());
      const topGoal = overdue[0] ?? userGoals[0];
      const title = overdue.length > 0
        ? `⚠ ${overdue.length}টি লক্ষ্য অতিক্রান্ত!`
        : `📚 ${userGoals.length}টি লক্ষ্য অপেক্ষমাণ`;
      const body = `আজ "${topGoal.topic}" নিয়ে কাজ শুরু করো। মোট ${userGoals.length}টি শেখার লক্ষ্য রয়েছে।`;

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ user_id: userId, type: "goal_reminder", title, body, goal_id: topGoal.id }),
      });
      if (insertRes.ok) created.push(userId);
    }

    return new Response(JSON.stringify({ ok: true, created: created.length, skipped: skipped.length, totalUsers: byUser.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("schedule-goal-reminders error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
